const Winston = require('winston');

const Auth = require('./auth.js');
const Configurations = require('./configurations.js');
const Sensor = require('./sensor.js');
const Reading = require('./reading.js');
const SensorTypes = require('./sensorTypes.js');
const Utils = require('./utils.js');
const Chain = Utils.Chain;

const RoutingCore = require('./routing.core.js');

exports.init = function(app) {

function testAllowAnon(data, options) {
    let isAnon = typeof data.user == 'undefined';
    if (options.allowAnon == 'only')
         return isAnon; // true if anon, false if not
     return options.allowAnon || !isAnon; // true if anons are allowed or if not anon
}

function mustachifyGeneral(data, options, callback) {
    let needs = options.mustacheDeps.general || [];

    if (needs.includes('sensorTypes'))
        data.sensorTypes = SensorTypes.getTypesMustache();

    if (needs.includes('time'))
        data.time = (new Date()).getTime();

    callback();
}

function mustachifyReading(data, options, callback) {
    function fail(error) {
        Winston.debug('Could not fully mustachify reading.', {
            "error": error
        });
    }

    let needs = options.mustacheDeps.reading || [];
    let reading = data.reading;

    if (needs.includes('htmlOut')) {
        reading.values.forEach((value) => {
            try {
                value.html = SensorTypes.getOutputTemplate(value);
            } catch(e) {
                value.html = '<span class="error">ERROR: Could not retrieve template for value.</span>';
                fail({
                    "type": "noTemplate",
                    "exception": e
                });
            }
        });
    }
    
    callback();
}

function mustachifyUser(data, options, callback) {
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
                (docs) => { // Success
                    user.sensors = docs;
                    if (needs.includes('sensors.typeData')) {
                        user.sensors.forEach((sensor) => {
                            sensor.typeData = SensorTypes.getTypeData(sensor.type);
                        });
                        this.next();
                    }
                    this.next();
                },
                (error) => { // Failure
                    fail({ "type": "userSensorList", "error": error });
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

function mustachifyConfiguration(data, options, callback) {
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
                (sensors) => {
                    configuration.sensors = sensors;
                    if (needs.includes('sensors.typeData')) {
                        sensors.forEach((sensor) => {
                            sensor.typeData = SensorTypes.getTypeData(sensor.type);
                        });
                        this.next();
                    }


                    if (needs.includes('sensors.htmlIn')) {
                        sensors.forEach((sensor, i) => {
                            sensor.html = SensorTypes.getInputTemplate(
                                sensor.type, data.user, configuration, sensor
                            );
                            sensor.index = i;
                        });
                        this.next();
                    }

                    this.next();
                },
                (error) => {
                    if (!hasFailed) {
                        fail({ "type": "sensorList", "error": error });
                        this.next();
                    }
                }
            );
        }

        // ----

        if (needs.includes('owner')) {
            Auth.findOid(configuration.owner,
                (owner) => {
                    configuration.owner = owner;
                    this.next();
                },
                (error) => {
                    fail({ "type": "configurationOwner", "error": error });
                },
                ['username']
            );
        }

        // ----

        if (needs.includes('readings')) {
            Reading.findConfiguration(configuration['_id'],
                (list) => {
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
                (error) => {
                    fail({ "type": "configurationOwner", "error": error });
                    this.next();
                },
                ['timeCreated']
            );
        }

        this.next();
    }, callback);
}


function mustachifySensor(data, options, callback) {
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

        // ----

        if (needs.includes('typeName')) {
            sensor.typeName = SensorTypes.getTypeName(sensor.type);
            this.next();
        }

        // ----

        if (needs.includes('owner')) {
            Auth.findOid(sensor.owner,
                (owner) => {
                    sensor.owner = owner;
                    this.next();
                },
                (error) => {
                    fail({ "type": "sensorOwner", "error": error });
                    this.next();
                },
                ['username']
            );
        }

        this.next();
    }, function() {
        callback();
    });
}

function stepMustachify(req, res, data, options, callback) {
    new Chain(function() {
        let mustacheDeps = options.mustacheDeps || {};
        this.pause(Object.keys(mustacheDeps).length);

        if (mustacheDeps.sensor)
            mustachifySensor(
                data, options,
                this.next.bind(this)
            );

        if (mustacheDeps.configuration)
            mustachifyConfiguration(
                data, options,
                this.next.bind(this)
            );

        if (mustacheDeps.user)
            mustachifyUser(
                data, options,
                this.next.bind(this)
            );

        if (mustacheDeps.reading)
            mustachifyReading(
                data, options,
                this.next.bind(this)
            );



        if (mustacheDeps.general)
            mustachifyGeneral(
                data, options,
                this.next.bind(this)
            );

        this.next();
    }, function() {
        callback();
    });
}

function renderUser(options) {
    app.get(options.url, (req, res) => {
        let data = {};
        
        new Chain(function() {
            RoutingCore.stepUser(req, res, data, options, this.next.bind(this));
        }, function() {
            if (testAllowAnon(data, options))
                RoutingCore.stepQuery(req, res, data, options, this.next.bind(this));
            else {
                if (req.session && req.session.oid)
                    res.redirect('/dashboard');
                else
                    res.redirect('/login');
            }
        }, function() {
            stepMustachify(req, res, data, options, this.next.bind(this));
        }, function() { 
            res.render(options.template, data);
        });
    });
}
function renderReading(options) {
    app.get(options.url, (req, res) => {
        let data = {};
        
        new Chain(function() {
            RoutingCore.stepUser(req, res, data, options, this.next.bind(this));
        }, function() {
            if (testAllowAnon(data, options))
                RoutingCore.stepReading(req, res, data, options, this.next.bind(this));
            else    
                res.redirect('/login');
        }, function() {
            if (typeof data.reading != 'undefined')
                RoutingCore.stepQuery(req, res, data, options, this.next.bind(this));
            else
                res.render('readingNF', data);          
        }, function() {
            stepMustachify(req, res, data, options, this.next.bind(this));
        }, function() {
            res.render(options.template, data);
        });
    });
}

function renderSensor(options) {
    app.get(options.url, (req, res) => {
        let data = {};
        
        new Chain(function() {
            RoutingCore.stepUser(req, res, data, options, this.next.bind(this));
        }, function() {
            if (testAllowAnon(data, options))
                RoutingCore.stepSensor(req, res, data, options, this.next.bind(this));
            else    
                res.redirect('/login');
        }, function() {
            if (typeof data.sensor != 'undefined')
                RoutingCore.stepQuery(req, res, data, options, this.next.bind(this));
            else
                res.render('sensorNF', data);          
        }, function() {
            stepMustachify(req, res, data, options, this.next.bind(this));
        }, function() {
            res.render(options.template, data);
        });
    });
}

function renderConfiguration(options) {
    app.get(options.url, (req, res) => {
        let data = {};
        
        new Chain(function() {
            RoutingCore.stepUser(req, res, data, options, this.next.bind(this));
        }, function() {
            if (testAllowAnon(data, options))
                RoutingCore.stepConfiguration(req, res, data, options, this.next.bind(this));
            else    
                res.redirect('/login');
        }, function() {
            if (typeof data.configuration != 'undefined')
                RoutingCore.stepQuery(req, res, data, options, this.next.bind(this));
            else
                res.render('configurationNF', data);          
        }, function() {
            stepMustachify(req, res, data, options, this.next.bind(this));
        }, function() {
            res.render(options.template, data);
        });
    });
}

renderUser({
    "url": '/user/edit',
    "template": 'userEdit'
});

renderUser({
    "url": '/sensors/new',
    "template": "sensorNew",
    "mustacheDeps": {
        "general": ["sensorTypes"]
    }
});

renderUser({
    "url": '/sensors',
    "template": 'sensorList',
    "mustacheDeps": {
        "user": ['sensors', 'sensors.typeData']
    }
});

renderUser({
    "url": '/register',
    "template": 'register',
    "allowAnon": "only"
});

renderUser({
    "url": '/login',
    "template": 'login',
    "allowAnon": "only"
});

renderUser({
    "url": '/dashboard',
    "template": 'dashboard'
});

renderUser({
    "url": '/tutorial',
    "template": 'tutorial'
});

renderUser({
    "url": '/visualize',
    "template": 'visualize',
    "allowAnon": true
});

renderUser({
    "url": '/map',
    "template": 'map',
    "allowAnon": true
});

let sensorPattern = '([0-9a-f]{24})';

renderSensor({
    "url": `/sensors/${sensorPattern}`,
    "template": 'sensor',
    "allowAnon": true,
    "mustacheDeps": {
        "sensor": ['typeName', 'owner']
    }
});

renderSensor({
    "url": `/sensors/${sensorPattern}/edit`,
    "template": 'sensorEdit',
    "mustacheDeps": {
        "sensor": ['typeModels']
    }
});

let configPattern = '([0-9a-f]{24})';

renderConfiguration({
    "url": `/configurations/${configPattern}/reading`,
    "template": "configurationReading",
    "mustacheDeps": {
        "configuration": ['sensors', 'sensors.typeData', 'sensors.htmlIn'],
        "general": ["time"]
    }
});

renderConfiguration({
    "url": `/configurations/${configPattern}`,
    "template": 'configuration',
    "mustacheDeps": {
        "configuration": ['sensors', 'sensors.typeData', 'owner']
    }
});

renderConfiguration({
    "url": `/configurations/${configPattern}/tutorial`,
    "template": 'configurationTutorial',
    "mustacheDeps": {
        "configuration": ['sensors', 'sensors.typeData']
    }
});

renderConfiguration({
    "url": `/configurations/${configPattern}/edit`,
    "template": 'configurationEdit'
});

renderConfiguration({
    "url": `/configurations/${configPattern}/readings`,
    "template": 'configurationReadingList',
    "mustacheDeps": {
        "configuration": ['readings']
    }
});

renderConfiguration({
    "url": `/configurations/${configPattern}/removeSensor`,
    "template": 'configurationRemoveSensor'
});

renderConfiguration({
    "url": `/configurations/${configPattern}/addSensor`,
    "template": 'configurationAddSensor',
    "mustacheDeps": {
        "user": ['sensors', 'sensors.typeData']
    }
});

let readingPattern = '([0-9a-f]{24})';

renderReading({
    "url": `/readings/${readingPattern}`,
    "template": 'reading',
    "allowAnon": true,
    "mustacheDeps": {
        "reading": ["htmlOut"]
    }
});

}