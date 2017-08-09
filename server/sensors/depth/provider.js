const ObjectId = require('mongodb').ObjectId;

exports.inputTemplate = function(user, configuration, sensor) {
    let sid = ObjectId(sensor['_id']);

    return `\
<label class="control-label" for="values.${sid}.depth">
    Depth
</label>
<div class="input-group">
    <input  name="values.${sid}.depth" class="form-control normalize"
            type="number" step="any"
            aria-describedby="addon-values_${sid}_depth"
            data-unittype="length" data-unit="meters" data-unitpref="feet">
    <br>
    <span class="input-group-addon" id="addon-values_${sid}_depth">Meters</span>
</div>
<div class="spoiler reading-more" data-spoiler-link="${sid}"></div>
<div class="spoiler-content" data-spoiler-link="${sid}">
    <label class="control-label" for="values.${sid}.depthRange">
        Depth Range (Optional)
    </label>
    <div class="input-group">
        <input  name="values.${sid}.depthRange" class="form-control normalize"
                type="number" step="any" 
                aria-describedby="addon-values_${sid}_depthRange"
                data-unittype="length" data-unit="meters" data-unitpref="feet">
        <br>
        <span id="addon-values_${sid}_depthRange" class="input-group-addon">Meters</span>
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