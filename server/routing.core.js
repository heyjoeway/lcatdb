const Winston = require('winston');

const Auth = require('./auth.js');
const Configurations = require('./configurations.js');
const Sensor = require('./sensor.js');
const Reading = require('./reading.js');

exports.stepQuery = function(req, res, data, options, callback) {
    data.query = req.query;
    data.body = req.body;
    callback();    
}

exports.stepUser = function(req, res, data, options, callback) {
    function fail(error) {
        Winston.debug("Cannot find valid user.", {
            "error": error
        });
        callback();
    }

    if (req.session && req.session.oid) {
        let oid = req.session.oid;

        Auth.findOid(oid,
            (user) => { // Success
                data.user = user;
                callback();
            },
            (error) => { // Failure
                fail({
                    "type": "notFound",
                    "error": error,
                    "oid": oid
                });
            }
        );
    } else fail({ "type": "noSession" });
}

exports.stepConfiguration = function(req, res, data, options, callback) {
    function fail(error) {
        Winston.debug("Cannot find valid configuration.", {
            "error": error
        });
        callback();
    }

    let cid = req.originalUrl.split('/')[2];

    Configurations.find(cid,
        (configuration) => { // Success
            data.configuration = configuration;
            data.configuration.canEdit = Configurations.canEdit(
                data.user,
                data.configuration
            );
            callback();
        },
        (error) => { // Failure
            fail({
                "type": "notFound",
                "error": error,
                "cid": cid
            });
        }
    );   
}

exports.stepSensor = function(req, res, data, options, callback) {
    function fail(error) {
        Winston.debug("Cannot find valid sensor.", {
            "error": error
        });
        callback();
    }

    let sid = req.originalUrl.split('/')[2];

    Sensor.find(sid,
        (sensor) => { // Success
            data.sensor = sensor;
            console.log(sensor);
            data.sensor.canEdit = Sensor.canEdit(
                data.user,
                data.sensor
            );
            callback();
        },
        (error) => { // Failure
            fail({
                "type": "notFound",
                "error": error,
                "sid": sid
            });
        }
    );
}

exports.stepReading = function(req, res, data, options, callback) {
    function fail(error) {
        Winston.debug("Cannot find valid reading.", {
            "error": error
        });
        callback(req, res, data, options);
    }

    let id = req.originalUrl.split('/')[2].split('?')[0];

    Reading.find(id,
        (reading) => { // Success
            data.reading = reading;
            callback(req, res, data, options);
        },
        () => { // Failure
            fail({
                "type": "notFound",
                "error": error,
                "cid": cid
            });
        }
    );
}