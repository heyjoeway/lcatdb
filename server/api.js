const SensorTypes = require('./sensorTypes.js');

exports.error = function(req, res, error) {
    res.send({
        "error": error
    });
}

exports.init = function(app) {

app.get('/api/sensorTypes', (req, res) => {
    res.send(SensorTypes.getTypes());
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