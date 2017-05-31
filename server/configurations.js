// ============================================================================
// IMPORTS
// ============================================================================

const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId;
const merge = require('merge');

// ----------------------------------------------------------------------------
// Champy-DB specific modules
// ----------------------------------------------------------------------------

const Schema = require('./schema.js');
const Db = require('./db.js');

// ============================================================================
// FINDING/LISTING
// ============================================================================

/**
 * Gets a list of configurations associated with a given user.
 * TODO: Search if a member of a configuration. Currently only searches if
 * owner.
 * 
 * @param {object} user - User object.
 * @param {function} callback - Callback to be run once configurations are found. Parameters are:
 *      - list: Array of configuration objects associated with user.
 */

exports.getList = function(user, callback) {
    let configurations = Db.collection('configurations');

    let query = { "owner": ObjectId(user["_id"]) };
    let cursor = configurations.find(query);
    cursor.toArray(function(err, list) {
        if (err) {
            return;
        }
        Winston.debug('Finished searching for configurations.', {
            "username": user.username,
            "list": list
        });
        callback(list);
    });
};

/**
 * Finds a configuration by object ID.
 *
 * @param {(object|string)} oid - ObjectId object or string.
 * @param {function} success - Callback to be run upon successful find. Parameters are:
 *      - configuration: Configuration object.
 * @param {function} failure - Callback to be run if no configuration is found. Parameters are:
 *      - err: mongoDB error object.
 */

exports.find = function(oid, success, failure) {
    let configurations = Db.collection('configurations');

    configurations.findOne(
        { "_id": ObjectId(oid) },
        (err, configuration) => {
            if (err || configuration == null) {
                Winston.warn('Error finding configuration.', {
                    "configuration": configuration,
                    "errInt ernal": err,
                    "oid": oid.toString()
                });
                failure(err);
                return;
            } else success(configuration);
        }
    );
}

// ============================================================================
// CREATION/EDITING
// ============================================================================

/**
 * Creates a new Configuration in a collection and provides the new oid.
 * 
 * @param {object} user - User object.
 * @param {object} configurations - mongoDB collection object.
 * @param {function} callback - Callback to be run upon successful creation. Parameters are:
 *      - oid: ObjectId of the new configuration.
 */

exports.new = function(user, callback) {
    let configurations = Db.collection('configurations');

    let newConfiguration = Schema.defaults("Configuration");
    
    [
        newConfiguration.owner,
        newConfiguration.creation
    ] = [
        ObjectId(user["_id"]),
        Date.now()
    ];

    configurations.save(newConfiguration, function(err, result) {
        if (err) {
            Winston.error("Error saving new configuration to database.", {
                "username": user.username,
                "newConfiguration": newConfiguration,
                "errorInternal": err
            });
            return;
        }
        Winston.debug('Successfully registered new configuration.', {
            "username": user.username,
            "newConfiguration": newConfiguration
        });
        // Run callback with the oid of the new configuration
        // as the parameter
        callback(ObjectId(result.ops[0]["_id"]));
    })
};

// ----------------------------------------------------------------------------

/**
 * Edits a configuration in a collection.
 * 
 * @param {object} user - User object.
 * @param {object} configurations - mongoDB collection object.
 * @param {(object|string)} oid - ObjectId object or string of the configuration to edit.
 * @param {function} success - Callback to be run upon successful edit.
 * @param {function} failure - Callback to be run upon failure.
 */

exports.edit = function(user, oid, edit, success, failure) {
    let configurations = Db.collection('configurations');

    function fail(error) {
        Winston.debug("Failed to edit configuration.", {
            "username": user.username,
            "oid": oid.toString(),
            "edit": edit,
            "error": error
        });

        failure(error);
    }

    exports.find(oid,
        (configuration) => {
            let canEdit = exports.canEdit(user, configuration);
            if (!canEdit) {
                fail({ "type": "canEdit" });
                return;
            }

            // -----

            let editValidity = Schema.validate('ConfigurationEdit', edit);
            
            if (!editValidity) {
                fail({ "type": "editValidity", "errors": Schema.errors() });
                return;
            }

            // -----

            let newData = merge.recursive(configuration, edit);

            configuration.edits.push({
                "time": Date.now(),
                "changes": edit
            });

            let completeValidity = Schema.validate('Configuration', configuration);
            
            if (!completeValidity) {
                fail({ "type": "completeValidity", "errors": Schema.errors() });
                return;
            }
            
            // -----

            configurations.updateOne({'_id': ObjectId(oid) }, newData,
                (errUpdate, writeResult) => {
                    if (writeResult.result.ok == 1) {
                        success();
                        return;
                    }
                    fail({
                        "type": "write",
                        "result": writeResult.toString(),
                        "error": errUpdate
                    });
                }
            );
        },
        (error) => { fail({ "type": "find", "error": error }) }
    );
}

// ----------------------------------------------------------------------------

/**
 * Tests if user is able to edit a configuration.
 * @param {object} user - User object
 * @param {object} configuration - Configuration object
 */

exports.canEdit = function(user, configuration) {
    let ownerId = ObjectId(configuration.owner);
    let userId = ObjectId(user["_id"]);
    let result = ownerId.equals(userId);

    if (!result) configuration.members.some(function(member, i, arr) {
        result = ownerId.equals(ObjectId(member.uid));
        return result;
    });

    Winston.debug("Testing if user can edit this configuration.", {
        "username": user.username,
        "result": result,
        "ownerId": ownerId.toString(),
        "userId": userId.toString(),
        "configurationId": ObjectId(configuration['_id']).toString()
    });

    return result;
};