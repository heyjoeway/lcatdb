const Schema = require('./schema.js');
const fs = require('fs');
const mustache = require('mustache');

class SensorTypes {
    /**
     * Initialize sensor types.
     * Since this is only run at startup, it's alright to read the data synchronously.
     */
    static init() {
        fs.readdirSync('./sensors/').forEach(path => {
            let schema = require("./sensors/" + path + "/schema.json");
            Schema.addSchema(schema);

            SensorTypes.types[path] = {
                "schemaId": schema.id,
                "schema": schema,
                "data": require("./sensors/" + path + "/data.json"),
                "inputTemplate": fs.readFileSync("./sensors/" + path + "/input.mustache", "utf8"),
                "outputTemplate": fs.readFileSync("./sensors/" + path + "/output.mustache", "utf8")
            };
        });
    }
    
    /**
     * Gets data about sensor type.
     * Excludes schemas and templates.
     * 
     * @param {string} typeKey
     * @param {object}
     */
    static getTypeData(type) {
        let types = SensorTypes.types;

        if (types[typeKey])
            return types[typeKey].data;
    }
}

SensorTypes.types = {};

module.exports = SensorTypes;