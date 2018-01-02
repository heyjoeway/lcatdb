// ============================================================================
// IMPORTS
// ============================================================================

const defaults = require('json-schema-defaults');
const deepcopy = require('deepcopy');
const fs = require('fs');

// ============================================================================
// VALIDATION
// ============================================================================

const Ajv = require('ajv');

// WARNING
// removeAdditional will modify validated data in place, removing any 
// additional properties (in areas where additionalProperties: false exists
// in the relevant schema).
// Same with coerceTypes.
// USE WITH CAUTION

const validator = new Ajv({
    "allErrors": true,
    "removeAdditional": true,
    "coerceTypes": true
});


// ============================================================================
// SETUP
// ============================================================================

const schemas = {};
const schemaDefaults = {};

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Generates defaults for all loaded schemas.
 */
exports.defaultsGen = function(schema) {
    let key = schema["id"];
    schemaDefaults[key] = defaults(schema);
}

exports.fieldsSafePrivate = function(key) {
    return schemas[key].safePrivate;
}

exports.addSchema = function(schema) {
    schemas[schema['id']] = schema;
    validator.addSchema(schema);
    exports.defaultsGen(schema);
}

/**
 * Loads schema manifest and generates defaults.
 */
exports.init = function(manifest) {
    fs.readdirSync('./schema/').forEach((path) => {
        let schema = require("./schema/" + path);
        exports.addSchema(schema);
    });
}

// ----------------------------------------------------------------------------

/**
 * Get the default object for the specified manifest.
 * 
 * @param {string} key - Key of required manifest.
 * @returns {object} - Defaults object.
 */
exports.defaults = function(key) {
    let val = schemaDefaults[key];

    if (typeof(val) == 'undefined') {
        schemaDefaults[key] = defaults(schemas[key]);
        val = schemaDefaults[key];
    }
    
    return deepcopy(val);
}

// ----------------------------------------------------------------------------

/**
 * Passthrough for the ajv validate function.
 * 
 * @param {string} schema - ID of schema
 * @param {object} data
 * @returns {bool}
 */
exports.validate = function(schema, data) {
    return validator.validate(schema, data);
}

/**
 * Passthrough for ajv errors.
 * 
 * @returns {object} - ajv error object.
 */
exports.errors = function() {
    return validator.errors;
}