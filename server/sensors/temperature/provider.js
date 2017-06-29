const ObjectId = require('mongodb').ObjectId;

exports.inputTemplate = function(user, configuration, sensor) {
    let sid = ObjectId(sensor['_id']);

    return `<div class="row">
<div class="col-xs-12 col-sm-6">
    <label class="control-label" for="values.${sid}.temperature">
        Temperature
    </label>
    <div class="input-group">
        <input class="form-control" type="number" step="any" name="values.${sid}.temperature"
        aria-describedby="addon-values_${sid}_temperature" id="values_${sid}_temperature" min="-90" max="90"><br>
        <span class="input-group-addon" id="addon-values_${sid}_temperature">C</span>
    </div>
</div>
<div class="col-xs-12 col-sm-6">
    <label class="control-label" for="values.${sid}.temperatureRange">
        Temperature Range (Optional)
    </label>
    <div class="input-group">
        <input class="form-control" type="number" step="any" name="values.${sid}.temperatureRange"
        aria-describedby="addon-values_${sid}_temperatureRange" id="values_${sid}_temperatureRange" min="-90" max="90"><br>
        <span class="input-group-addon" id="addon-values_${sid}_temperatureRange">C</span>
    </div>
</div>
</div>`;
}

exports.outputTemplate = function(user, value) {
    return `\
Temperature: ${value.temperature}<br>
<div class="sensor_output_more">
    Temperature Range: ${value.temperatureRange}<br>
</div>`;
}