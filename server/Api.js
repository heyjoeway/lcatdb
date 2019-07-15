const SensorTypes = require('./SensorTypes.js');
const Schema = require('./Schema');
const Reading = require('./Reading');
const Utils = require('./Utils');
const Chain = Utils.Chain;
const Winston = require('winston');
const Auth = require ('./Auth');
const Configurations = require('./Configurations');
const Sensor = require('./Sensors.js');

exports.init = function(app) {

function fail(req, res, error) {
    Winston.debug("Error processing API request.", {
        "error": error
    })
    res.send({ "error": error });
}

// List all sensor types; model information included
app.all('/api/sensorTypes', (req, res) => {
    res.send(SensorTypes.types);
});

// Allow only post requests on readings API
app.get('/api/readings', (req, res) => {
    res.redirect('/api.html');
});

// Get readings from request
// TODO: Set timeout limit to prevent attacks
app.post(`/api/readings`, (req, res) => {
    let query = req.body;

    let queryValidity = Schema.validate('/ApiQuery', query);
    
    if (!queryValidity) return fail(req, res, {
        "errorName": "queryValidity",
        "errorNameFull": "Api.readings.queryValidity",
        "errorData": {
            "schemaErrors": Schema.errors()
        }
    });

    query.filter = query.filter || {};

    if (query.filter['_id']) Reading.find(
        query.filter['_id'],
        reading => res.send([reading]),
        error => fail(req, res, error)
    );
    else Reading.findQuery(
        query,
        list => res.send(list),
        error => fail(req, res, error)
    );
});

app.post(`/api/offlineData`, (req, res) => {
    let data = {};

    new Chain(function() {
        if (req.session && req.session.oid)
            return this.next();
        
        fail(req, res, {
            "errorName": "noSession",
            "errorNameFull": "Api.userInfo.noSession"
        });
    }, function() {
        let oid = req.session.oid;
    
        Auth.findUid(oid,
            this.next.bind(this),
            error => fail(req, res, {
                "errorName": "userNotFound",
                "errorNameFull": "Api.userInfo.userNotFound",
                "errorData": {
                    "oid": oid
                }
            }),
            Schema.fieldsSafePrivate('/User')
        );
    }, function(user) {
        data.user = user;

        Configurations.getList(
            user,
            this.next.bind(this),
            error => fail(req, res, {
                "errorName": "configurationError",
                "errorNameFull": "Api.userInfo.configurationError",
                "errorData": {
                    "errorConfiguration": error
                }
            }),
            ['_id', 'name', 'sensors']
        );
    }, function(list) {
        data.configurations = list;
        
        this.pause(list.length);
        let hasFailed = false;
        
        list.forEach(configuration => {
            Configurations.getSensorList(
                configuration,
                sensors => {
                    if (hasFailed) return;                    
                    configuration.sensors = sensors;
                    this.next();
                },
                error => {
                    if (hasFailed) return;                    
                    fail(req, res, {
                        "errorName": "sensorListError",
                        "errorNameFull": "Api.userInfo.sensorListError",
                        "errorData": {
                            "errorSensorList": error
                        }
                    });
                    hasFailed = true;
                },
                [
                    "creation",
                    "description",
                    "model",
                    "name",
                    "owner",
                    "type",
                    "_id"
                ]
            );
        });

        this.next();
    }, function() {
        data.sensorTypes = SensorTypes.types;
        data.time = new Date().getTime();
        res.send(data);
    });
});

};


// app.post(`/api/readings/submit`, function(req, res) {
//     let query = req.body;

//     let apiReadingValidity = Schema.validate('/ApiReading', query);
//     if (!apiReadingValidity) return fail(req, res, {
//         "errorName": "apiReadingValidity",
//         "errorNameFull": "Api.readings.submit.apiReadingValidity",
//         "errorData": {
//             "schemaErrors": Schema.errors()
//         }
//     });

//     let reading = query.reading;

//     // TODO
// });
