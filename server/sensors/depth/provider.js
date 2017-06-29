const ObjectId = require('mongodb').ObjectId;

exports.inputTemplate = function(user, configuration, sensor) {
    let sid = ObjectId(sensor['_id']);

    return `<div class="row">
<div class="col-xs-12 col-sm-6">
    <label class="control-label" for="values.${sid}.depth">
        Depth
    </label>
    <div class="input-group">
        <input class="form-control" type="number" step="any" name="values.${sid}.depth"
        aria-describedby="addon-values_${sid}_depth" id="values_${sid}_depth" min="-90" max="90"><br>
        <span class="input-group-addon" id="addon-values_${sid}_depth">Meters</span>
    </div>
</div>
<div class="col-xs-12 col-sm-6">
    <label class="control-label" for="values.${sid}.depthRange">
        Depth Range (Optional)
    </label>
    <div class="input-group">
        <input class="form-control" type="number" step="any" name="values.${sid}.depthRange"
        aria-describedby="addon-values_${sid}_depthRange" id="values_${sid}_depthRange" min="-90" max="90"><br>
        <span class="input-group-addon" id="addon-values_${sid}_depthRange">Meters</span>
    </div>
</div>
</div>`;
}

exports.outputTemplate = function(user, value) {
    return `
Depth: ${value.depth}<br>
<div class="sensor_output_more">
    Depth Range: ${value.depthRange}<br>
</div>
`;
}