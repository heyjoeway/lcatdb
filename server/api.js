const SensorTypes = require('./sensorTypes.js');
const Schema = require('./schema.js');
const Reading = require('./reading.js');
const Utils = require('./utils.js');
const Chain = Utils.Chain;
const Winston = require('winston');
const Auth = require ('./auth.js');
const Configurations = require('./configurations.js');
const Sensor = require('./sensor.js');

function fail(req, res, error) {
    Winston.debug("Error processing API request.", {
        "error": error
    })
    res.send({ "error": error });
}

exports.init = function(app) {

// List all sensor types; model information included
app.all('/api/sensorTypes', (req, res) => {
    res.send(SensorTypes.getTypes());
});

let readingsInstructions = `\
Please provide your POST request in the following format:

{
    "filter": <query filter>,
    "projection": <projection>,
    "pageSize": <# of items, optional>,
    "page": <page #, optional>
}

Please refer to the MongoDB documentation for the query format. (https://docs.mongodb.com/manual/tutorial/query-documents/)`;

// Allow only post requests on API
app.get('/api/readings', (req, res) => {
    fail(req, res, {
        "errorName": "instruction",
        "errorNameFull": "Api.readings.instruction",
        "errorData": {
            "instructions": readingsInstructions
        }
    });
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

    if (query.filter['_id']) {
        Reading.find(
            query.filter['_id'],
            (reading) => { res.send([reading]); },
            (error) => { fail(req, res, error ); }
        )
    } else {
        Reading.findQuery(
            query,
            (list) => { res.send(list); },
            (error) => { fail(req, res, error ); }
        );
    }
});

app.post(`/api/offlineData`, (req, res) => {
    let data = {};

    new Chain(function() {
        console.log("test1");
        if (req.session && req.session.oid)
            return this.next();
        
        fail(req, res, {
            "errorName": "noSession",
            "errorNameFull": "Api.userInfo.noSession"
        });
    }, function() {
        let oid = req.session.oid;
    
        Auth.findOid(oid,
            this.next.bind(this),
            (error) => { // Failure
                fail(req, res, {
                    "errorName": "userNotFound",
                    "errorNameFull": "Api.userInfo.userNotFound",
                    "errorData": {
                        // "errorFind": error,
                        "oid": oid
                    }
                });
            },
            Schema.fieldsSafePrivate('/User')
        );

    }, function(user) {
        data.user = user;

        Configurations.getList(
            user,
            this.next.bind(this),
            function(error) {
                fail(req, res, {
                    "errorName": "configurationError",
                    "errorNameFull": "Api.userInfo.configurationError",
                    "errorData": {
                        "errorConfiguration": error
                    }
                });
            },
            ['_id', 'name', 'sensors']
        );
        
    }, function(list) {
        data.configurations = list;
        
        this.pause(list.length);
        let hasFailed = false;
        
        list.forEach((configuration) => {
            Configurations.getSensorList(configuration,
                (sensors) => {
                    if (hasFailed) return;                    
                    configuration.sensors = sensors;
                    this.next();
                },
                (error) => {
                    if (hasFailed) return;                    
                    fail(req, res, {
                        "errorName": "sensorListError",
                        "errorNameFull": "Api.userInfo.sensorListError",
                        "errorData": {
                            "errorSensorList": error
                        }
                    });
                    hasFailed = true;
                }
            );
        });

        this.next();
    }, function() {
        data.sensorTypes = SensorTypes.getTypes();
        data.time = new Date().getTime();
        res.send(data);
    });

});

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

};