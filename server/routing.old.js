const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId; 

const Utils = require('./utils.js');
const Auth = require('./auth.js');
const Configurations = require('./configurations.js');
const Sensor = require('./sensor.js');
const SensorTypes = require('./sensorTypes.js');
const Reading = require('./reading.js');

exports.init = function(app) {

// ------------------------------------
// Login (action)
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



// ============================================================================
// SESSIONS
// ============================================================================

/* Tests if the current session is valid. Redirects if not.
 * 
 * req: Express request object.
 * res: Express response object.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Same as before.
 *      - res: Same as before.
 *      - user: User object.
 */

function sessionTest(req, res, success, allowAnon) {
    function fail(error) {
        Winston.debug("Session not valid.", {
            "error": error 
        });
        res.redirect('/login');
    }

    if (req.session && req.session.oid) {
        let oid = Utils.testOid(req.session.oid, fail);
        if (!oid) return;
        
        Auth.findOid(oid,
            (user) => { // Success
                success(req, res, user);
            },
            (error) => { // Failure
                fail({
                    "type": "notFound",
                    "error": error,
                    "oid": oid
                });
            }
        );
    } else if (allowAnon) return success(req, res);
    else fail({ "type": "noSession" });
}

// ----------------------------------------------------------------------------

/* Provides a layer to app.post which auto tests for a valid session.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 */

function sessionPost(url, success, allowAnon) {
    app.post(url, (req, res) => {
        sessionTest(req, res, success, allowAnon);
    });
}

// ============================================================================
// SENSORS
// ============================================================================

/* Tests if the current sensor is valid. Responds if not.
 * Also tests if the current session is valid. (Using sessionTest.)
 * 
 * req: Express request object.
 * res: Express response object.
 * user: User object.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Same as before.
 *      - res: Same as before.
 *      - user: User object.
 */

function sensorTest(req, res, user, success) {
    let id = req.originalUrl.split('/')[2];

    Sensor.find(id,
        (sensor) => { // Success
            success(req, res, user, sensor);
        },
        () => { // Failure
            res.render('sensorNF', {
                "user": user
            });
        }
    );
}

// ----------------------------------------------------------------------------

/* Provides a layer to app.post which handles the relevant sensor.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 *      - sensor: Sensor object.
 */

function sensorPost(url, success) {
    sessionPost(url, function(req, res, user) {
        sensorTest(req, res, user, success);
    });
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// ------------------------------------
// Sensors (Pages)
// ------------------------------------

let sensorPattern = '([0-9a-f]{24})';

// ------------------------------------
// Sensor edit (action)
// ------------------------------------

sessionPost(`/sensors/${sensorPattern}/editDo`, (req, res, user) => {
    let id = req.originalUrl.split('/')[2];

    Sensor.edit(user, id, req.body,
        () => {
            let url = `/sensors/${id}`;
            if (req.query.configuration)
                url = `/configurations/${req.query.configuration}`
            res.redirect(url);
        },
        (error) => { res.send(`Error processing request. (${error.type})`); }
    );
});

// ------------------------------------
// New Sensor (action)
// ------------------------------------

sessionPost('/sensors/newDo', (req, res, user) => {
    Sensor.new(user, req.body, req.body.configuration,
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

// ============================================================================
// CONFIGURATIONS
// ============================================================================

/* Tests if the current configuration is valid. Responds if not.
 * Also tests if the current session is valid. (Using sessionTest.)
 * 
 * req: Express request object.
 * res: Express response object.
 * user: User object.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Same as before.
 *      - res: Same as before.
 *      - user: User object.
 */

function configurationTest(req, res, user, success) {
    let id = req.originalUrl.split('/')[2];

    Configurations.find(id,
        (configuration) => { // Success
            success(req, res, user, configuration);
        },
        () => { // Failure
            res.render('configurationNF', {
                "user": user
            });
        }
    );
}

// ----------------------------------------------------------------------------

/* Provides a layer to app.post which handles the relevant configuration.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 *      - configuration: Configuration object.
 */

function configurationPost(url, success) {
    sessionPost(url, function(req, res, user) {
        configurationTest(req, res, user, success);
    });
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// ------------------------------------
// Configuration (pages)
// ------------------------------------

/* Regex explanation:
 * ^: Start of string.
 * \/: '/', preceeded by the escape character ('\').
 * configurations: Plain text.
 * \/: Same as before.
 * ([a-f]|[0-9]): Lowercase characters 'a' through 'f' and numbers 0 - 9.
 * {24}: Match the above requirements 24 times.
 * 
 * This will match any mongoDB generated object ID.
 */

let configPattern = '([0-9a-f]{24})';

// ------------------------------------
// Configuration edit (action)
// ------------------------------------

sessionPost(`/configurations/${configPattern}/editDo`, (req, res, user) => {
    let cid = req.originalUrl.split('/')[2];

    Configurations.edit(
        {
            "user": user,
            "cid": cid,
            "edit": req.body
        },
        () => { res.redirect(`/configurations/${cid}`); },
        (error) => { res.send(`Error processing request. (${error.type})`); }
    );
});



// ------------------------------------
// Remove Sensor (action)
// ------------------------------------

sessionPost(`/configurations/${configPattern}/removeSensorDo`, (req, res, user) => {
    let cid = req.originalUrl.split('/')[2];

    Configurations.edit(
        {
            "user": user,
            "cid": cid,
            "removeSensors": [req.body.sid]
        },
        () => { res.redirect(`/configurations/${cid}`); },
        (error) => { res.send(`Error processing request. (${error.type})`); }
    );
});

// ------------------------------------
// Add Sensor to Configuration (action)
// ------------------------------------

sessionPost(`/configurations/${configPattern}/addSensorDo`, (req, res, user) => {
    function fail(error) {
        res.send(`Error processing request. (${error.type})`);
    }

    let cid = req.originalUrl.split('/')[2];
    let sid = req.body.sid;

    Configurations.addSensor(user, cid, sid,
         () => { res.redirect(`/configurations/${cid}`); },
         fail
    );
});

// ------------------------------------
// Submit a Reading (Action)
// ------------------------------------

configurationPost(`/configurations/${configPattern}/readingDo`, (req, res, user, configuration) => {
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

    function setPath(obj, path, val) {
        let pathArray = path.split('.');
        let lastCrumb = pathArray.pop();
        pathArray.forEach((crumb) => {
            if (typeof obj[crumb] == 'undefined')
                obj[crumb] = {};
            obj = obj[crumb];
        });
        obj[lastCrumb] = val;
    }

    let rawData = req.body;
    let newData = {};

    Object.keys(rawData).forEach((key) => {
        setPath(newData, key, rawData[key]);
    });

    let oldValues = newData.values;

    newData.values = [];

    if (!Utils.exists(oldValues)) {
        return Reading.new(
            user,
            configuration,
            newData,
            success,
            fail
        );
    }

    let valueKeys = Object.keys(oldValues);
    let valuesLeft = valueKeys.length; 
    let hasFailed = false;

    valueKeys.forEach((key) => {
        let sid = ObjectId(key);
        Sensor.find(sid,
            (sensor) => {
                if (hasFailed) return;
                newData.values.push({
                    "sensor": sid.toString(),
                    "type": sensor.type,
                    "data": oldValues[key]
                });


                if (--valuesLeft == 0) {
                    Reading.new(
                        user,
                        configuration,
                        newData,
                        success,
                        fail
                    );
                }
            },
            (error) => {
                if (hasFailed) return;
                fail({ "type": "sensorFind", "error": error });
                hasFailed = true;
            }
        );
    });

});

}; // End init()