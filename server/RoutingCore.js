const Winston = require('winston');

const Auth = require('./Auth');
const Configurations = require('./Configurations');
const Sensor = require('./Sensors');
const Reading = require('./Reading');
const Forgot = require('./Forgot');

class RoutingCore {
    static stepQuery(req, res, data, options, callback) {
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
    
    static stepUser(req, res, data, options, callback) {
        function fail(error) {
            Winston.debug("Cannot find valid user.", {
                "error": error
            });
            callback();
        }
    
        if (req.session && req.session.oid) {
            let oid = req.session.oid;
    
            Auth.findUid(oid,
                user => { // Success
                    data.user = user;
                    callback();
                },
                error => { // Failure
                    fail({
                        "errorName": "notFound",
                        "errorNameFull": "RoutingCore.stepUser.notFound",
                        "errorData": {
                            "errorFind": error,
                            "oid": oid
                        }
                    });
                }
            );
        } else fail({
            "errorName": "noSession",
            "errorNameFull": "RoutingCore.stepUser.noSession"
        });
    }
    
    static stepConfiguration(req, res, data, options, callback) {
        function fail(error) {
            Winston.debug("Cannot find valid configuration.", {
                "error": error
            });
            callback();
        }
    
        let cid = req.originalUrl.split('/')[2];
    
        Configurations.find(cid,
            configuration => { // Success
                data.configuration = configuration;
                data.configuration.canEdit = Configurations.canEdit(
                    data.user,
                    data.configuration
                );
                callback();
            },
            error => { // Failure
                fail({
                    "errorName": "notFound",
                    "errorNameFull": "RoutingCore.stepConfiguration.notFound",
                    "errorData": {
                        "errorFind": error,
                        "cid": cid
                    }
                });
            }
        );   
    }
    
    static stepSensor(req, res, data, options, callback) {
        function fail(error) {
            Winston.debug("Cannot find valid sensor.", {
                "error": error
            });
            callback();
        }
    
        let sid = req.originalUrl.split('/')[2];
    
        Sensor.find(sid,
            sensor => { // Success
                data.sensor = sensor;
                data.sensor.canEdit = Sensor.canEdit(
                    data.user,
                    data.sensor
                );
                callback();
            },
            error => { // Failure
                fail({
                    "errorName": "notFound",
                    "errorNameFull": "RoutingCore.stepSensor.notFound",
                    "errorData": {
                        "errorFind": error,
                        "sid": sid
                    }
                });
            }
        );
    }
    
    static stepReading(req, res, data, options, callback) {
        function fail(error) {
            Winston.debug("Cannot find valid reading.", {
                "error": error
            });
            callback(req, res, data, options);
        }
    
        let rid = req.originalUrl.split('/')[2].split('?')[0];
    
        Reading.find(rid,
            reading => { // Success
                data.reading = reading;
                callback(req, res, data, options);
            },
            () => { // Failure
                fail({
                    "errorName": "notFound",
                    "errorNameFull": "RoutingCore.stepReading.notFound",
                    "errorData": {
                        "errorFind": error,
                        "rid": rid
                    }
                });
            }
        );
    }
    
    static stepForgot(req, res, data, options, callback) {
        function fail(error) {
            Winston.debug("Cannot find forgot password request.", {
                "error": error
            });
            callback(req, res, data, options);
        }
    
        data.forgot = {};
        let fid = req.originalUrl.split('/')[2].split('?')[0];
        
        Forgot.find(fid,
            forgot => { // Success
                data.forgot.exists = true;
                data.forgot.fid = fid;
                callback(req, res, data, options);
            },
            error => { // Failure
                data.forgot.exists = false;
                fail({
                    "errorName": "notFound",
                    "errorNameFull": "RoutingCore.stepForgot.notFound",
                    "errorData": {
                        "errorFind": error,
                        "fid": fid
                    }
                });
            }
        );
    }
}

module.exports = RoutingCore;