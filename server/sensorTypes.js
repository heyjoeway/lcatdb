const Schema = require('./schema.js');
const fs = require('fs');
const mustache = require('mustache');

const types = {};

exports.init = function() {
    fs.readdirSync('./sensors/').forEach((path) => {
        let schema = require("./sensors/" + path + "/schema.json");
        Schema.addSchema(schema);

        let type = {
            "schemaId": schema.id,
            "schema": schema,
            "data": require("./sensors/" + path + "/data.json"),
            "inputTemplate": fs.readFileSync("./sensors/" + path + "/input.mustache", "utf8"),
            "outputTemplate": fs.readFileSync("./sensors/" + path + "/output.mustache", "utf8")
        }

        types[path] = type;
    });
}

exports.isValidType = function(type) {
    return Object.keys(types).includes(type);
}

exports.getTypesMustache = function() {
    let result = [];

    Object.keys(types).forEach((key) => {
        result.push({
            "key": key,
            "type": types[key]
        });
    });

    return result;
}

exports.getTypes = function() {
    return types;
}

exports.getTypeName = function(type) {
    return types[type].data.name;
}

exports.getTypeData = function(type) {
    if (types[type]) return types[type].data;
    return undefined;
}



exports.getInputTemplate = function(type) {
    return types[type].inputTemplate;
}

exports.renderInputTemplate = function(type, user, configuration, sensor) {
    return mustache.render(
        exports.getInputTemplate(type),
        {
            "user": user,
            "configuration": configuration,
            "sensor": sensor
        }
    );
};



exports.getOutputTemplate = function(type) {
    return types[type].outputTemplate;
}

exports.renderOutputTemplate = function(value, user) {
    return mustache.render(
        exports.getOutputTemplate(value.type),
        {
            "value": value
        }
    );
};



exports.getSchemaId = function(type) {
    return types[type].schemaId;
}