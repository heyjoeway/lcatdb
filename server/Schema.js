const defaults = require('json-schema-defaults');
const deepcopy = require('deepcopy');
const fs = require('fs');
const Ajv = require('ajv');

class Schema {
    /**
     * Generates defaults for a schema.
     * 
     * @param {object} schema
     */
    static defaultsGen(schema) {
        let key = schema["id"];
        Schema.schemaDefaults[key] = defaults(schema);
    }
    
    /**
     * Gets all fields that are safe to show to the owner of the data.
     * 
     * @param {string} key Key of schema
     */
    static fieldsSafePrivate(key) {
        return Schema.schemas[key].safePrivate;
    }
    
    /**
     * Adds a new schema to the list and validator and generates its defaults.
     * 
     * @param {object} schema
     */
    static addSchema(schema) {
        Schema.schemas[schema['id']] = schema;
        Schema.validator.addSchema(schema);
        Schema.defaultsGen(schema);
    }
    
    /**
     * Loads schemas and generates defaults.
     */
    static init() {
        fs.readdirSync('./schema/').forEach((path) => {
            let schema = require("./schema/" + path);
            Schema.addSchema(schema);
        });
    }
    
    /**
     * Get the default object for the specified manifest.
     * 
     * @param {string} key - Key of required manifest.
     * @returns {object} - Defaults object.
     */
    static defaults(key) {
        let val = Schema.schemaDefaults[key];
    
        if (typeof(val) == 'undefined') {
            Schema.schemaDefaults[key] = defaults(Schema.schemas[key]);
            val = Schema.schemaDefaults[key];
        }
        
        return deepcopy(val);
    }

    /**
     * Passthrough for the ajv validate function.
     * 
     * @param {string} schema ID of schema
     * @param {object} data
     * @returns {bool}
     */
    static validate(schema, data) {
        return Schema.validator.validate(schema, data);
    }
    
    /**
     * Passthrough for ajv errors.
     * 
     * @returns {object} ajv error object.
     */
    static errors() {
        return Schema.validator.errors;
    }
}

// WARNING
// removeAdditional will modify validated data in place, removing any 
// additional properties (in areas where additionalProperties: false exists
// in the relevant schema).
// Same with coerceTypes.
// USE WITH CAUTION

Schema.validator = new Ajv({
    "allErrors": true,
    "removeAdditional": true,
    "coerceTypes": true
});
Schema.schemas = {};
Schema.schemaDefaults = {};

module.exports = Schema;