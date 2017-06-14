const ObjectId = require('mongodb').ObjectId;

exports.inputTemplate = function(user, configuration, sensor) {
    let sid = ObjectId(sensor['_id']);

    return `
Depth: <input name="values.${sid}.depth"><br>
<div class="sensor_input_more">
    Depth Range: <input name="values.${sid}.depthRange"><br>
</div>
`;
}

exports.outputTemplate = function(user, value) {
    return `
Depth: ${value.depth}<br>
<div class="sensor_output_more">
    Depth Range: ${value.depthRange}<br>
</div>
`;
}