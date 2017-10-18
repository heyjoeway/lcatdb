const SensorTypes = require('./sensorTypes.js');
const Schema = require('./schema.js');
const Reading = require('./reading.js');
const Utils = require('./utils.js');
const Chain = Utils.Chain;
const Winston = require('winston');

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

};