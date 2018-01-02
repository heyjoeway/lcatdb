const ObjectId = require('mongodb').ObjectId;

exports.inputTemplate = function(user, configuration, sensor) {
    let sid = ObjectId(sensor['_id']);

    return `\
<label class="control-label">Depth</label>
<div class="input-group">
    <input  name="values.${sid}.depth" class="form-control normalize"
            type="number" step="any"
            aria-describedby="addon-values_${sid}_depth"
            data-unittype="length" data-unit="meters" data-unitprefsystem="imperial">
    <br>
    <span class="input-group-addon" id="addon-values_${sid}_depth">Meters</span>
</div>
<div class="spoiler reading-more" data-spoiler-link="${sid}"></div>
<div class="spoiler-content" data-spoiler-link="${sid}">
    <label class="control-label">Depth Range (Optional)</label>
    <div class="input-group">
        <input  name="values.${sid}.depthRange" class="form-control normalize"
                type="number" step="any" 
                aria-describedby="addon-values_${sid}_depthRange"
                data-unittype="length" data-unit="meters" data-unitprefsystem="imperial">
        <br>
        <span id="addon-values_${sid}_depthRange" class="input-group-addon">Meters</span>
    </div>
</div>`;
}

exports.outputTemplate = function(value, user) {
    let html = `
<div class="value-title">Depth</div>
<div class="value-var">
    <span class="normalize"
        data-unittype="length"
        data-unit="meters"
        data-unitprefsystem="imperial"
        data-unitround="2"
        aria-describedby="${value.sensor}_depthLabel">
        ${value.data.depth}
    </span>&nbsp;
    <span id="${value.sensor}_depthLabel">Meters</span>
</div>
`;

    if (value.data.depthRange)
        html += `
<div class="value-title">Depth Range</div>
<div class="value-var">
    <span class="normalize"
        data-unittype="length"
        data-unit="meters"
        data-unitprefsystem="imperial"
        data-unitround="2"
        aria-describedby="${value.sensor}_depthRangeLabel">
        ${value.data.depthRange}
    </span>&nbsp;
    <span id="${value.sensor}_depthRangeLabel">Meters</span>
</div>
`;

    return html;
}