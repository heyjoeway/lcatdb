const Schema = require('./Schema');
const fs = require('fs');
const mustache = require('mustache');

/**
 * Initialize sensor types.
 * Since this is only run at startup, it's alright to read the data synchronously.
 */
exports.init = function() {
    fs.readdirSync('./sensors/').forEach(path => {
        let schema = require(`./sensors/${path}/schema.json`);
        Schema.addSchema(schema);

        exports.types[path] = {
            "schemaId": schema.id,
            "schema": schema,
            "data": require(`./sensors/${path}/data.json`),
            "display": require(`./sensors/${path}/display.json`),
        };
    });
};

/**
 * Gets data about sensor type.
 * Excludes schemas and templates.
 * 
 * @param {string} typeKey
 * @param {object}
 */
exports.getTypeData = function(typeKey) {
    let types = exports.types;

    if (types[typeKey])
        return types[typeKey].data;
};

exports.types = {};