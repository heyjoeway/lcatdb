const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId; 

const Utils = require('./utils.js');
const Auth = require('./auth.js');
const Configurations = require('./configurations.js');
const Sensor = require('./sensor.js');
const SensorTypes = require('./sensorTypes.js');
const Reading = require('./reading.js');
const Chain = Utils.Chain;

const RoutingCore = require('./routing.core.js');

exports.init = function(app) {

app.get('/configurations/new', (req, res, user) => {
    let data = {};

    new Chain(function() {
        RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
    }, function() {
        if (data.user)
            Configurations.new(data.user, this.next.bind(this));
        else
            res.redirect('/login');
    }, function(cid) {
        res.redirect(`/configurations/${cid}/edit`);
    });
});

// ------------------------------------
// Login
// ------------------------------------

app.post('/logindo', (req, res) => {
    Auth.login(req.body.username, req.body.password, 
        (oid) => { // Success
            req.session.oid = oid.toString();
            res.redirect('/dashboard');
        },
        (error) => { // Failure
            res.redirect('/login?invalid');
        }
    );
});

// ------------------------------------
// Register (action)
// ------------------------------------

app.post('/registerdo', (req, res) => {
    Auth.register(req.body,
        (oid) => { // Success
            req.session.oid = oid.toString();

            if (typeof req.query.quick != 'undefined')
                res.redirect('/tutorial/standard');
            else
                res.redirect('/tutorial');
        },
        (errors) => {
            let errorString = '/register?'; 
            errors.forEach((error) => {
                if (error.type == 'validity')
                    errorString += (error.properties
                        .toString()
                        .split(',')
                        .join('=true&')) + '=true&';
                else
                    errorString += error.type + '=true&';
            });

            errorString = errorString.substr(0, errorString.length - 1);
            res.redirect(errorString);
        }
    );
});

// ------------------------------------
// Logout (action)
// ------------------------------------

app.all('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/');
});

// ------------------------------------
// Configuration edit
// ------------------------------------
let configPattern = '([0-9a-f]{24})';

app.post(`/configurations/${configPattern}/editDo`, (req, res) => {
    let cid = req.originalUrl.split('/')[2];
    let data = {};

    new Chain(function() {
        RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
    }, function() {
        if (typeof data.user == 'undefined')
            return res.redirect('/login');

        Configurations.edit(
            {
                "user": data.user,
                "cid": cid,
                "edit": req.body
            },
            () => { res.redirect(`/configurations/${cid}`); },
            (error) => { res.send(`Error processing request. (${error.type})`); }
        );
    });
});

// ------------------------------------
// Remove Sensor (action)
// ------------------------------------

app.post(`/configurations/${configPattern}/removeSensorDo`, (req, res) => {
    let cid = req.originalUrl.split('/')[2];
    let data = {};

    new Chain(function() {
        RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
    }, function() {
        Configurations.edit(
            {
                "user": data.user,
                "cid": cid,
                "removeSensors": [req.body.sid]
            },
            () => { res.redirect(`/configurations/${cid}`); },
            (error) => { res.send(`Error processing request. (${error.type})`); }
        );
    });
});

// ------------------------------------
// Add Sensor to Configuration (action)
// ------------------------------------

app.post(`/configurations/${configPattern}/addSensorDo`, (req, res) => {
    let cid = req.originalUrl.split('/')[2];
    let sid = req.body.sid;

    let data = {};

    new Chain(function() {
        RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
    }, function() {
        Configurations.addSensor(data.user, cid, sid,
            () => { res.redirect(`/configurations/${cid}`); },
            (error) => { res.send(`Error processing request. (${error.type})`); }
        );
    });
});

// ------------------------------------
// Sensor edit (action)
// ------------------------------------

let sensorPattern = '([0-9a-f]{24})';

app.post(`/sensors/${sensorPattern}/editDo`, (req, res) => {
    let sid = req.originalUrl.split('/')[2];
    let data = {};

    new Chain(function() {
        RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
    }, function() {
        Sensor.edit(data.user, sid, req.body,
            () => {
                let url = `/sensors/${sid}`;
                if (typeof req.query.configuration != 'undefined')
                    url = `/configurations/${req.query.configuration}`
                res.redirect(url);
            },
            (error) => { res.send(`Error processing request. (${error.type})`); }
        );
    });
});

// ------------------------------------
// New Sensor (action)
// ------------------------------------

app.post('/sensors/newDo', (req, res) => {
    let data = {};

    new Chain(function() {
        RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
    }, function() {
        Sensor.new(data.user, req.body, req.body.configuration,
            (id) => {
                let url = `/sensors/${id}/edit`
                if (req.query.configuration)
                    url += `?configuration=${req.query.configuration}`
                res.redirect(url);
            },
            (error) => {
                res.send("Error creating new sensor."); // TODO
            }
        );
    });
});


// ------------------------------------
// Submit a Reading (Action)
// ------------------------------------

app.post(`/configurations/${configPattern}/readingDo`, (req, res) => {
    function fail(error) {
        Winston.debug('Error creating new reading', {
            "error": error
        });
        res.send(`Error creating new reading. (${error.type})`);
    }

    function success(rid) {
        res.redirect(`/readings/${rid}`);
    }

    // ----

    // Reorganize Sensor data

    let rawData = req.body;
    let newData = {};

    Object.keys(rawData).forEach((key) => {
        Utils.setPath(newData, key, rawData[key]);
    });

    let oldValues = newData.values || {};
    let valueKeys = Object.keys(oldValues);
    let hasFailed = false;

    newData.values = [];

    // ----

    let data = {};

    new Chain(function() {
        RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
    }, function() {
        if (typeof data.user == 'undefined')
            return fail({ "type": "noUser"});
        RoutingCore.stepConfiguration(req, res, data, {}, this.next.bind(this));
    }, function() {
        if (typeof data.configuration == 'undefined')
            return fail({ "type": "noConfiguration"});

        this.pause(valueKeys.length);
        this.next();

        valueKeys.forEach((key) => {
            let sid = ObjectId(key);
            if (hasFailed) return;
            Sensor.find(sid,
                (sensor) => {
                    newData.values.push({
                        "sensor": sid.toString(),
                        "type": sensor.type,
                        "data": oldValues[key]
                    });

                    this.next();
                },
                (error) => {
                    if (hasFailed) return;
                    fail({ "type": "sensorFind", "error": error });
                    hasFailed = true;
                }
            );
        });
    }, function() {
        Reading.new(
            data.user,
            data.configuration,
            newData,
            success,
            fail
        );
    });
});

}