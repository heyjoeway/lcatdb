const Ajv = require('ajv');


// WARNING
// removeAdditional will modify validated data in place, removing any 
// additional properties (in areas where additionalProperties: true exists)
// in the relevant schema).
// USE WITH CAUTION

const validator = new Ajv({
    "allErrors": true,
    "removeAdditional": true
});
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
        validator.addSchema(schemas[key], key);
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

exports.defaults = function(key) {
    let val = schemaDefaults[key];

    if (typeof(val) == 'undefined') {
        schemaDefaults[key] = defaults(schemas[key]);
        val = schemaDefaults[key];
    }
    
    return deepcopy(val);
}

// ----------------------------------------------------------------------------

exports.validate = function(schema, data) {
    return validator.validate(schema, data);
}

exports.errors = function() {
    return validator.errors;
}