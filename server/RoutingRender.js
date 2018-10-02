const Winston = require('winston');
const fs = require('fs');
const mustache = require('mustache');

const Auth = require('./Auth');
const Configurations = require('./Configurations');
const Sensor = require('./Sensors');
const Reading = require('./Reading');
const SensorTypes = require('./SensorTypes');
const Utils = require('./Utils');
const Chain = Utils.Chain;

const RoutingCore = require('./RoutingCore');

exports.init = function(app) {
    let manifest = require("./routingRenderManifest.json");
    manifest.forEach(
        options => exports.initPage(app, options)
    );
}

exports.initPage = function(app, options) {
    let reqSteps = options.steps.map(
        key => exports.steps[key]
    );
    reqSteps.push(function(req, res, data, options) {
        res.render(options.template, data);
    });
    app.get(options.url, (req, res) => {
        let data = {};
        let chain = new Chain(reqSteps);
        chain.next(req, res, data, options);
    });
}

exports.testAllowAnon = function(data, options) {
    let isAnon = typeof data.user == 'undefined';
    if (options.allowAnon == 'only')
            return isAnon; // true if anon, false if not
    return options.allowAnon || !isAnon; // true if anons are allowed or if not anon
}

exports.mustachifyGeneral = function(data, options, callback) {
    let needs = options.mustacheDeps.general || [];

    if (needs.includes('sensorTypes')) {
        let types = SensorTypes.types;
        data.sensorTypes = [];

        Object.keys(types).forEach(key => {
            data.sensorTypes.push({
                "key": key,
                "type": types[key]
            });
        });
    }

    if (needs.includes('time'))
        data.time = (new Date()).getTime();

    callback();
}

exports.mustachifyReading = function(data, options, callback) {
    function fail(error) {
        Winston.debug('Could not fully mustachify reading.', {
            "error": error
        });
    }

    let needs = options.mustacheDeps.reading || [];
    let reading = data.reading;

    if (needs.includes('htmlOut')) {
        reading.values.forEach(value => {
            try {
                value.html = mustache.render(
                    SensorTypes.types[value.type].outputTemplate,
                    { "value": value }
                );
            } catch(e) {
                value.html = '<span class="error">ERROR: Could not retrieve template for value.</span>';
                fail({
                    "errorName": "noTemplate",
                    "errorNameFull": "RoutingRender.mustachifyReading.noTemplate",
                    "errorData": {
                        "exception": e
                    }
                });
            }
        });
    }
    
    callback();
}

exports.mustachifyUser = function(data, options, callback) {
    function fail(error) {
        Winston.debug('Could not fully mustachify user.', {
            "error": error
        });
    }

    new Chain(function() {
        let needs = options.mustacheDeps.user || [];
        this.pause(needs.length);

        let user = data.user;

        if (needs.includes('sensors')) {
            Sensor.getList(user, 
                docs => { // Success
                    user.sensors = docs;
                    if (needs.includes('sensors.typeData')) {
                        user.sensors.forEach(sensor => {
                            sensor.typeData = SensorTypes.getTypeData(sensor.type);
                        });
                        this.next();
                    }
                    this.next();
                },
                error => { // Failure
                    fail({
                        "errorName": "userSensorList",
                        "errorNameFull": "RoutingRender.mustachifyUser.userSensorList",
                        "errorData": {
                            "errorGetList": error
                        }
                    });
                    this.next();
                    if (needs.includes('sensors.typeData'))
                        this.next();
                },
                ['name', 'model', 'type'] // Requirements
            );
        }

        this.next();
    }, callback);
}

exports.mustachifyConfiguration = function(data, options, callback) {
    function fail(error) {
        Winston.debug('Could not fully mustachify configuration.', {
            "error": error
        });
    }

    new Chain(function() {
        let needs = options.mustacheDeps.configuration || [];
        this.pause(needs.length);

        let configuration = data.configuration;

        if (needs.includes('sensors')) {
            Configurations.getSensorList(configuration,
                sensors => {
                    configuration.sensors = sensors;
                    if (needs.includes('sensors.typeData')) {
                        sensors.forEach(sensor => {
                            sensor.typeData = SensorTypes.getTypeData(sensor.type);
                        });
                        this.next();
                    }

                    this.next();
                },
                error => {
                    if (hasFailed) return;

                    fail({
                        "errorName": "sensorList",
                        "errorNameFull": "RoutingRender.mustachifyConfiguration.sensorList",
                        "errorData": {
                            "errorFind": error
                        }
                    });
                    this.next();
                }
            );
        }

        if (needs.includes('owner')) {
            Auth.findUid(configuration.owner,
                owner => { // Success
                    configuration.owner = owner;
                    this.next();
                },
                error => { // Failure
                    configuration.owner = {};
                    this.next();

                },
                ['username']
            );
        }

        if (needs.includes('readings')) {
            Reading.findConfiguration(configuration['_id'],
                list => {
                    list.sort((a, b) => {
                        let timeA = parseInt(a.timeCreated);
                        let timeB = parseInt(b.timeCreated);
                        if (timeA > timeB) return -1;
                        if (timeA < timeB) return 1;
                        return 0;
                    });
                    configuration.readings = list;
                    this.next();
                },
                error => {
                    fail({
                        "errorName": "readings",
                        "errorNameFull": "RoutingRender.mustachifyConfiguration.readings",
                        "errorData": {
                            "errorFind": error
                        }
                    });
                    this.next();
                },
                ['timeCreated']
            );
        }

        this.next();
    }, callback);
}

exports.mustachifySensor = function(data, options, callback) {
    function fail(error) {
        Winston.debug('Could not fully mustachify sensor.', {
            "error": error
        });
    }

    new Chain(function() {
        let needs = options.mustacheDeps.sensor || [];
        this.pause(needs.length);

        let sensor = data.sensor;

        if (needs.includes('typeModels')) {
            sensor.typeModels = SensorTypes.getTypeData(sensor.type).models;
            this.next();
        }

        if (needs.includes('typeName')) {
            sensor.typeName = SensorTypes.types[sensor.type].data.name;
            this.next();
        }

        if (needs.includes('owner')) {
            Auth.findUid(
                sensor.owner,
                owner => {
                    sensor.owner = owner;
                    this.next();
                },
                error => {
                    sensor.owner = {};
                    this.next();
                },
                ['username']
            );
        }

        this.next();
    }, callback);
};

exports.steps = {
    user: function(req, res, data, options) {
        RoutingCore.stepUser(
            req, res, data, options,
            () => {
                if (exports.testAllowAnon(data, options))
                    this.next(req, res, data, options);
                else
                    res.redirect('/login');
            }
        );
    },
    query: function(req, res, data, options) {
        RoutingCore.stepQuery(
            req, res, data, options,
            this.next.bind(this, req, res, data, options)
        );
    },
    mustachify: function(req, res, data, options) {
        let mustachifyFuncs = {
            sensor: exports.mustachifySensor,
            configuration: exports.mustachifyConfiguration,
            user: exports.mustachifyUser,
            reading: exports.mustachifyReading,
            general: exports.mustachifyGeneral
        };

        let callback = this.next.bind(this, req, res, data, options);

        new Chain(function() {
            let mustacheDeps = options.mustacheDeps || {};
            let mdKeys = Object.keys(mustacheDeps);
            this.pause(mdKeys.length);
    
            mdKeys.forEach(key => {
                mustachifyFuncs[key](
                    data, options,
                    this.next.bind(this)
                )
            });
    
            this.next();
        }, callback);
    },
    reading: function(req, res, data, options) {
        RoutingCore.stepReading(
            req, res, data, options,
            () => {
                if (typeof data.reading != 'undefined')
                    this.next(req, res, data, options);
                else
                    res.render('readingNF', data);
            }
        );
    },
    sensor: function(req, res, data, options) {
        RoutingCore.stepSensor(
            req, res, data, options,
            () => {
                if (typeof data.sensor != 'undefined')
                    this.next(req, res, data, options);
                else
                    res.render('sensorNF', data);
            }
        );
    },
    configuration: function(req, res, data, options) {
        RoutingCore.stepConfiguration(
            req, res, data, options,
            () => {
                if (typeof data.configuration != 'undefined')
                    this.next(req, res, data, options);
                else
                    res.render('configurationNF', data);
            }
        );
    },
    forgot: function(req, res, data, options) {
        RoutingCore.stepForgot(
            req, res, data, options,
            () => {
                if (data.forgot.exists)
                    this.next(req, res, data, options);
                else
                    res.render('forgotNF', data);
            }
        );
    }
};