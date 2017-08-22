const SensorTypes = require('./sensorTypes.js');
const Schema = require('./schema.js');
const Reading = require('./reading.js');
const Utils = require('./utils.js');
const Chain = Utils.Chain;

function fail(req, res, error) {
    res.send({
        "error": error
    });
}

exports.init = function(app) {

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

app.get('/api/readings', (req, res) => {
    fail(req, res, {
        "errorName": "instruction",
        "errorData": {
            "instructions": readingsInstructions
        }
    });
});

app.post(`/api/readings`, (req, res) => {
    let query = req.body;

    let queryValidity = Schema.validate('/ApiQuery', query);
    
    if (!queryValidity) return fail(req, res, {
        "errorName": "queryValidity",
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

// app.get('/api/sensorTypes/*', (req, res) => {
//     let type = req.originalUrl.split('/')[3];
//     let typeData = SensorTypes.getTypeData(type);
//     if (typeData) res.send(typeData);
//     else exports.error(req, res, {
//         "errorName": "unknown",
//         "errorData": {
//             "type": type
//         }
//     });
// });

};