const Winston = require('winston');

const Auth = require('./auth.js');
const Configurations = require('./configurations.js');
const Sensor = require('./Sensors.js');
const Reading = require('./reading.js');
const Forgot = require('./forgot.js');

exports.stepQuery = function(req, res, data, options, callback) {
    data.query = req.query;
    data.body = req.body;

    data.queryString = "";
    if (data.query && data.query.length != 0) {
        Object.keys(data.query).forEach(function(key) {
            data.queryString += key + '=' + data.query[key] + ',';
        });
        data.queryString = data.queryString.substring(0, data.queryString.length - 1);
    }
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
                    "errorName": "notFound",
                    "errorNameFull": "Routing.core.stepUser.notFound",
                    "errorData": {
                        "errorFind": error,
                        "oid": oid
                    }
                });
            }
        );
    } else fail({
        "errorName": "noSession",
        "errorNameFull": "Routing.core.stepUser.noSession"
    });
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
                "errorName": "notFound",
                "errorNameFull": "Routing.core.stepConfiguration.notFound",
                "errorData": {
                    "errorFind": error,
                    "cid": cid
                }
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
            data.sensor.canEdit = Sensor.canEdit(
                data.user,
                data.sensor
            );
            callback();
        },
        (error) => { // Failure
            fail({
                "errorName": "notFound",
                "errorNameFull": "Routing.core.stepSensor.notFound",
                "errorData": {
                    "errorFind": error,
                    "sid": sid
                }
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

    let rid = req.originalUrl.split('/')[2].split('?')[0];

    Reading.find(rid,
        (reading) => { // Success
            data.reading = reading;
            callback(req, res, data, options);
        },
        () => { // Failure
            fail({
                "errorName": "notFound",
                "errorNameFull": "Routing.core.stepReading.notFound",
                "errorData": {
                    "errorFind": error,
                    "rid": rid
                }
            });
        }
    );
}


exports.stepForgot = function(req, res, data, options, callback) {
    function fail(error) {
        Winston.debug("Cannot find forgot password request.", {
            "error": error
        });
        callback(req, res, data, options);
    }

    data.forgot = {};
    let fid = req.originalUrl.split('/')[2].split('?')[0];
    
    Forgot.find(fid,
        (forgot) => { // Success
            data.forgot.exists = true;
            data.forgot.fid = fid;
            callback(req, res, data, options);
        },
        (error) => { // Failure
            data.forgot.exists = false;
            fail({
                "errorName": "notFound",
                "errorNameFull": "Routing.core.stepForgot.notFound",
                "errorData": {
                    "errorFind": error,
                    "fid": fid
                }
            });
        }
    );
}