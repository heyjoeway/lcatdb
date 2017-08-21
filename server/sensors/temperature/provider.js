const ObjectId = require('mongodb').ObjectId;

exports.inputTemplate = function(user, configuration, sensor) {
    let sid = ObjectId(sensor['_id']);

    return `\
<label class="control-label">Temperature</label>
<div class="input-group">
    <input  name="values.${sid}.temperature" class="form-control normalize"
            type="number" step="any"
            aria-describedby="addon-values_${sid}_temperature"
            data-unittype="temperature" data-unit="celcius" data-unitpref="farenheit">
    <span class="input-group-addon" id="addon-values_${sid}_temperature">Meters</span>
    <br>
</div>
<div class="spoiler reading-more" data-spoiler-link="${sid}"></div>
<div class="spoiler-content" data-spoiler-link="${sid}">
    <label class="control-label">Temperature Range (Optional)</label>
    <div class="input-group">
        <input  name="values.${sid}.temperatureRange" class="form-control normalize"
                type="number" step="any" 
                aria-describedby="addon-values_${sid}_temperatureRange"
                data-unittype="temperature" data-unit="celcius" data-unitpref="farenheit">
        <span id="addon-values_${sid}_temperatureRange" class="input-group-addon">Meters</span>
        <br>
    </div>
</div>`;
}

exports.outputTemplate = function(user, value) {
    let html = `
<h5 class="h-inline">Temperature</h5>
<div>
    <span class="normalize"
        data-unittype="temperature"
        data-unit="celcius"
        data-unitpref="farenheit"
        aria-describedby="${value.sensor}_temperatureLabel">
        ${value.temperature}
    </span>
    &nbsp;
    <span id="${value.sensor}_temperatureLabel">Celcius</span>
</div>
`;

    if (value.temperatureRange)
        html += `
<h5 class="h-inline">Temperature Range</h5>
<div>
    <span class="normalize"
        data-unittype="temperature"
        data-unit="celcius"
        data-unitpref="farenheit"
        aria-describedby="${value.sensor}_temperatureRangeLabel">
        ${value.temperatureRange}
    </span>
    &nbsp;
    <span id="${value.sensor}_temperatureRangeLabel">Celcius</span>
</div>
`;

    return html;
}