const Schema = require('./schema.js');
const fs = require('fs');

const types = {};

exports.init = function() {
    fs.readdirSync('./sensors/').forEach((path) => {
        let schema = require("./sensors/" + path + "/schema.json");
        Schema.addSchema(schema);

        let type = {
            "schemaId": schema.id,
            "provider": require("./sensors/" + path + "/provider.js"),
            "data": require("./sensors/" + path + "/data.json")
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

exports.getTypeName = function(type) {
    return types[type].data.name;
}

exports.getModelsList = function(type) {
    return types[type].data.models;
}

exports.getInputTemplate = function(type, user, configuration, sensor) {
    return types[type].provider.inputTemplate(
        user, configuration, sensor
    );
};

exports.getOutputTemplate = function(type, user, value) {
    return types[type].provider.outputTemplate(
        user, value
    );
};

exports.getSchemaId = function(type) {
    return types[type].schemaId;
}