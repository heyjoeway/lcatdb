const ObjectId = require('mongodb').ObjectId;

exports.inputTemplate = function(user, configuration, sensor) {
    let sid = ObjectId(sensor['_id']);

    return `
Temperature: <input name="values.${sid}.temperature"><br>
<div class="sensor_input_more">
    Temperature Range: <input name="values.${sid}.temperatureRange"><br>
</div><br>
`;
}

exports.outputTemplate = function(user, value) {
    return `
temperature: ${value.temperature}<br>
<div class="sensor_output_more">
    Temperature Range: ${value.temperatureRange}<br>
</div>
`;
}