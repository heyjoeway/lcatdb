// ============================================================================
// IMPORTS
// ============================================================================

const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId;
const deepmerge = require('deepmerge');

// ----------------------------------------------------------------------------
// Champy-DB specific modules
// ----------------------------------------------------------------------------

const Schema = require('./schema.js');
const Db = require('./db.js');
const Sensor = require('./sensor.js');

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
                    "errInternal": err,
                    "oid": oid.toString()
                });
                failure(err);
                return;
            } else success(configuration);
        }
    );
}

// TODO: Retrieve only necessary information
exports.getSensorList = function(configuration, success, failure) {
    function fail(error) {
        Winston.debug("Could not retrieve sensor list.", {
            "error": error
        });
        failure(error);
    }

    let result = [];
    let sensorsLeft = configuration.sensors.length;
    let hasFailed = false;

    configuration.sensors.forEach((id) => {
        Sensor.find(ObjectId(id),
            (sensor) => {
                if (hasFailed) return;

                result.push(sensor)
                sensorsLeft--;
                if (sensorsLeft == 0)
                    success(result);
            },
            (error) => {
                if (hasFailed) return;

                fail(error);
                hasFailed = true;                
            }
        );
    });
};

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

    let newConfiguration = Schema.defaults('/Configuration');
    
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
 * Edits a Configuration in the collection.
 * TODO: Push edit history using a mongoDB push and not pulling the whole log
 * each time.
 * 
 * @param {object} user - User object.
 * @param {(object|string)} oid - ObjectId object or string of the configuration to edit.
 * @param {object} edit - Data to edit the Configuration with..
 * @param {function} success - Callback to be run upon successful edit.
 * @param {function} failure - Callback to be run upon failure.
 */

exports.edit = function(user, oid, edit, success, failure) {

    function fail(error) {
        Winston.debug("Failed to edit configuration.", {
            "username": user.username,
            "oid": (oid || "").toString(),
            "edit": edit,
            "error": error
        });

        failure(error);
    }

    try { oid = ObjectId(oid); }
    catch(e) { return fail({ "type": "badId", "exception": e }); }

    exports.find(oid,
        (configuration) => {
            let canEdit = exports.canEdit(user, configuration);
            if (!canEdit) {
                fail({ "type": "canEdit" });
                return;
            }

            // -----

            let editValidity = Schema.validate('/ConfigurationEdit', edit);
            
            if (!editValidity) {
                fail({ "type": "editValidity", "errors": Schema.errors() });
                return;
            }

            // -----

            exports.canAddSensorMulti(user, edit.sensors, () => {
                // Custom array merge function ensures all arrays are concatenated.
                // e.g:
                // >> let test1 = { "test": [ 1, 2, 3 ]}
                // >> let test2 = { "test": [ 4, 5, 6 ]}
                // >> deepmerge(test1, test2, { ... })
                // { "test": [ 1, 2, 3, 4, 5, 6 ] }
                
                let newData = deepmerge(configuration, edit, {
                    arrayMerge: (dest, src) => { return dest.concat(src) }
                });

                configuration.edits.push({
                    "uid": ObjectId(user['_id']),
                    "time": Date.now(),
                    "changes": edit
                });

                let completeValidity = Schema.validate('/Configuration', configuration);
                
                if (!completeValidity) {
                    fail({ "type": "completeValidity", "errors": Schema.errors() });
                    return;
                }
                
                // -----
            
               let configurations = Db.collection('configurations');

                configurations.updateOne({'_id': ObjectId(oid) }, newData,
                    (errUpdate, writeResult) => {
                        if (errUpdate || writeResult.result.ok != 1) {
                            console.log(errUpdate);
                            return fail({
                                "type": "write",
                                "result": (writeResult || "").toString(),
                                "error": errUpdate
                            });
                        }
                        
                        success();
                    }
                );

            }, fail);

            // -----

        },
        (error) => { fail({ "type": "find", "error": error }) }
    );
}

exports.canAddSensor = function(user, sid, success, failure) {
    function fail(error) {
        Winston.debug("Cannot add sensor.", {
            "error": error
        });
        failure(error);
        return error;
    }
    
    Sensor.find(sid,
        (sensor) => {
            let ownerId = ObjectId(sensor.owner);
            let userId = ObjectId(user["_id"]);
            let result = ownerId.equals(userId);

            if (!result) return fail({ "type": "mismatch" });

            success();
        },
        (error) => { fail({ "type": "find", "error": error }) }
    );
}

exports.canAddSensorMulti = function(user, sidArray, success, failure) {
    function fail(error) {
        Winston.debug("Could not add one or more sensors.", {
            "error": error,
            "sidArray": sidArray
        });
        failure(error);
        return error;
    }

    if (typeof sidArray == "undefined") return success();

    let responsesLeft = sidArray.length;
    let hasFailed = false;

    sidArray.forEach((sid) => {
        exports.canAddSensor(user, sid,
            () => {
                if (hasFailed) return;
                responsesLeft--;
                if (responsesLeft == 0) success();
            },
            (error) => {
                if (hasFailed) return;
                fail(error);
                hasFailed = true;
            }
        )
    });
}

// ----------------------------------------------------------------------------

/**
 * Tests if user is able to edit a configuration.
 * TODO: Replace with a more fleshed-out permission system.
 * 
 * @param {object} user - User object
 * @param {object} configuration - Configuration object
 * @returns {bool} result
 */

exports.canEdit = function(user, configuration) {
    let ownerId = ObjectId(configuration.owner);
    let userId = ObjectId(user["_id"]);
    let result = ownerId.equals(userId);

    if (!result) configuration.members.some((member) => {
        result = userId.equals(ObjectId(member.uid));
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

// ----------------------------------------------------------------------------

/**
 * Adds a pre-existing Sensor to a configuration.
 * 
 * @param {object} user
 * @param {string|object} cid
 * @param {string|object} sid
 * @param {function} success
 * @param {function} failure
 */

exports.addSensor = function(user, cid, sid, success, failure) {
    function fail(error) {
        Winston.debug("Failed to add sensor to configuration.", {
            "error": error
        });
        failure(error);
    }

    let data = {
        "sensors": [sid.toString()]
    };

    exports.edit(user, cid, data, success, failure);
};