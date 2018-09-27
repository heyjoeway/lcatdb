const Winston = require('winston');
const fs = require('fs');
const mustache = require('mustache');

const Auth = require('./auth.js');
const Configurations = require('./configurations.js');
const Sensor = require('./Sensors.js');
const Reading = require('./reading.js');
const SensorTypes = require('./SensorTypes.js');
const Utils = require('./Utils.js');
const Chain = Utils.Chain;

const RoutingCore = require('./routing.core.js');

class RoutingRender {
    static init(app) {
        let manifest = require("./routingRenderManifest.json");
        manifest.forEach(
            options => RoutingRender.initPage(app, options)
        );
    }

    static initPage(app, options) {
        let reqSteps = options.steps.map(
            key => RoutingRender.steps[key]
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

    static testAllowAnon(data, options) {
        let isAnon = typeof data.user == 'undefined';
        if (options.allowAnon == 'only')
             return isAnon; // true if anon, false if not
        return options.allowAnon || !isAnon; // true if anons are allowed or if not anon
    }

    static mustachifyGeneral(data, options, callback) {
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

    static mustachifyReading(data, options, callback) {
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
                        "errorNameFull": "Routing.render.mustachifyReading.noTemplate",
                        "errorData": {
                            "exception": e
                        }
                    });
                }
            });
        }
        
        callback();
    }

    static mustachifyUser(data, options, callback) {
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
                            "errorNameFull": "Routing.render.mustachifyUser.userSensorList",
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

    static mustachifyConfiguration(data, options, callback) {
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
                            "errorNameFull": "Routing.render.mustachifyConfiguration.sensorList",
                            "errorData": {
                                "errorFind": error
                            }
                        });
                        this.next();
                    }
                );
            }
    
            if (needs.includes('owner')) {
                Auth.findOid(configuration.owner,
                    owner => { // Success
                        configuration.owner = owner;
                        this.next();
                    },
                    error => { // Failure
                        fail({
                            "errorName": "configurationOwner",
                            "errorNameFull": "Routing.render.mustachifyConfiguration.configurationOwner",
                            "errorData": {
                                "errorFind": error
                            }
                        });
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
                            "errorNameFull": "Routing.render.mustachifyConfiguration.readings",
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

    static mustachifySensor(data, options, callback) {
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
                Auth.findOid(
                    sensor.owner,
                    owner => {
                        sensor.owner = owner;
                        this.next();
                    },
                    error => {
                        fail({
                            "errorName": "sensorOwner",
                            "errorNameFull": "Routing.render.mustachifySensor.sensorOwner",
                            "errorData": {
                                "errorFind": error
                            }
                        });
                        this.next();
                    },
                    ['username']
                );
            }
    
            this.next();
        }, callback);
    }
}

RoutingRender.steps = {
    user: function(req, res, data, options) {
        RoutingCore.stepUser(
            req, res, data, options,
            () => {
                if (RoutingRender.testAllowAnon(data, options))
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
            sensor: RoutingRender.mustachifySensor,
            configuration: RoutingRender.mustachifyConfiguration,
            user: RoutingRender.mustachifyUser,
            reading: RoutingRender.mustachifyReading,
            general: RoutingRender.mustachifyGeneral
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
                if (typeof data.forgot != 'undefined')
                    this.next(req, res, data, options);
                else
                    res.render('forgotNF', data);
            }
        );
    }
};

module.exports = RoutingRender;