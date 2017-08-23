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

exports.outputTemplate = function(value, user) {
    let html = `
<div class="value-title">Temperature</div>
<div class="value-var">
    <span class="normalize"
        data-unittype="temperature"
        data-unit="celcius"
        data-unitpref="farenheit"
        aria-describedby="${value.sensor}_temperatureLabel">
        ${value.data.temperature}
    </span>
    &nbsp;
    <span id="${value.sensor}_temperatureLabel">Celcius</span>
</div>
`;

    if (value.data.temperatureRange)
        html += `
<div class="value-title">Temperature Range</div>
<div class="value-var">
    <span class="normalize"
        data-unittype="temperature"
        data-unit="celcius"
        data-unitpref="farenheit"
        aria-describedby="${value.sensor}_temperatureRangeLabel">
        ${value.data.temperatureRange}
    </span>
    &nbsp;
    <span id="${value.sensor}_temperatureRangeLabel">Celcius</span>
</div>
`;

    return html;
}