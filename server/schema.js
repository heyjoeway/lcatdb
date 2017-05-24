const JsonSchema = require('jsonschema');

const validator = new JsonSchema.Validator();
const defaults = require('json-schema-defaults');
const deepcopy = require('deepcopy');

// ----------------------------------------------------------------------------

const schemas = {};
const schemaDefaults = {};

// ----------------------------------------------------------------------------

exports.loadSchemaManifest = function(manifest) {
    Object.keys(manifest).forEach(function(key) {
        let val = manifest[key];
        schemas[key] = require(val);
        validator.addSchema(schemas[key]);
    });
}

exports.defaultsGen = function() {
    Object.keys(schemas).forEach(function(key) {
        let val = schemas[key];
        schemaDefaults[key] = defaults(val);
    });
}

exports.init = function(manifest) {
    exports.loadSchemaManifest(manifest);
    exports.defaultsGen();
}

// ----------------------------------------------------------------------------

exports.defaults = function(schema) {
    return defaults(schema);
};

exports.defaultsKey = function(key) {
    let val = schemaDefaults[key];

    if (typeof(val) == 'undefined') {
        schemaDefaults[key] = defaults(schemas[key]);
        val = schemaDefaults[key];
    }
    
    return deepcopy(val);
}

// ----------------------------------------------------------------------------

exports.validate = function(any, schema) {
    return validator.validate(any, schema);
}

exports.validateKey = function(any, key) {
    return validator.validate(any, schemas[key]);
}