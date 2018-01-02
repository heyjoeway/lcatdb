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
            "provider": require("./sensors/" + path + "/provider.js"),
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
    let typesFinal = {};

    Object.keys(types).forEach((key) => {
        typesFinal[key] = types[key].data;
    });

    return typesFinal;
}

exports.getTypeName = function(type) {
    return types[type].data.name;
}

exports.getTypeData = function(type) {
    if (types[type]) return types[type].data;
    return undefined;
}

exports.getInputTemplate = function(type, user, configuration, sensor) {
    return mustache.render(types[type].inputTemplate, {
        "user": user,
        "configuration": configuration,
        "sensor": sensor
    });
};

exports.getOutputTemplate = function(value, user) {
    return mustache.render(types[value.type].outputTemplate, {
        "value": value
    });
};

exports.getSchemaId = function(type) {
    return types[type].schemaId;
}