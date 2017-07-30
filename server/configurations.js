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
const Utils = require('./utils.js');
const Auth = require('./auth.js');
const Reading = require('./reading.js');

const Chain = Utils.Chain;

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

exports.getList = function(user, success, reqs) {
    function fail(error) {
        Winston.debug('Could not find configuration list for user.', {
            "error": error
        });
    }

    let configurations = Db.collection('configurations');

    let query = { "owner": ObjectId(user["_id"]).toString() };
    let fields = Utils.reqsToObj(reqs);

    let cursor = configurations.find(query, fields);

    cursor.toArray(function(error, list) {
        if (error) return fail({
            "type": "cursor",
            "error": error
        });

        Winston.debug('Finished searching for configurations.', {
            // "list": list
        });
        success(list);
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

exports.find = function(cid, success, failure, reqs) {
    function fail(error) {
        Winston.warn('Error finding configuration.', {
            // "configuration": configuration,
            // "errInternal": error,
            "cid": cid.toString()
        });
        failure(error);
    }

    let configurations = Db.collection('configurations');

    let fields = Utils.reqsToObj(reqs);

    configurations.findOne(
        { "_id": ObjectId(cid) },
        fields,
        function(error, configuration) {
            if ((error != null) || !Utils.exists(configuration)) {
                return fail({
                    "type": 'find',
                    "error": error
                });
            }
            success(configuration);
        }
    );
}

exports.getSensorList = function(configuration, success, failure, reqs) {
    function fail(error) {
        Winston.debug("Could not retrieve sensor list for configuration.", {
            "error": error
        });
        failure(error);
    }

    let sensors = configuration.sensors;

    if (!Utils.exists(sensors))
        success([]);

    let result = [];
    let hasFailed = false;

    new Chain(function() {
        this.pause(sensors.length - 1);
   
        sensors.forEach((id) => {
            Sensor.find(ObjectId(id),
                (sensor) => { // Success
                    if (hasFailed) return;
                    result.push(sensor)
                    this.next(result);
                },
                (error) => { // Failure
                    if (hasFailed) return;
                    fail(error);
                    hasFailed = true;                
                },
                reqs
            );
        });
    }, success);
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

exports.new = function(user, success, failure) {
    function fail(error) {

    }

    let configurations = Db.collection('configurations');

    let newConfiguration = Schema.defaults('/Configuration');
    
    [
        newConfiguration.owner,
        newConfiguration.creation
    ] = [
        ObjectId(user["_id"]).toString(),
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
        // Run success with the oid of the new configuration
        // as the parameter
        success(ObjectId(result.ops[0]["_id"]));
    })
};

// ----------------------------------------------------------------------------

/**
 * Edits a Configuration in the collection.
 * TODO: Push edit history using a mongoDB push and not pulling the whole log
 * each time.
 * 
 * @param {object} user - User object.
 * @param {(object|string)} cid - ObjectId object or string of the configuration to edit.
 * @param {object} edit - Data to edit the Configuration with..
 * @param {function} success - Callback to be run upon successful edit.
 * @param {function} failure - Callback to be run upon failure.
 */

exports.edit = function(user, cid, edit, success, failure) {
    function fail(error) {
        Winston.debug("Failed to edit configuration.", {
            "username": user.username,
            "cid": (cid || "").toString(),
            "edit": edit,
            "error": error
        });

        failure(error);
    }

    // ----

    cid = Utils.testOid(cid, fail);
    if (!cid) return;

    // ----

    new Chain(function() {
        exports.find(cid,
            this.next.bind(this),
            (error) => {
                fail({ "type": "find", "error": error });
            }
        );
    }, function(configuration) {
        let canEdit = exports.canEdit(user, configuration);
        if (!canEdit)
            return fail({ "type": "canEdit" });

        let editValidity = Schema.validate('/ConfigurationEdit', edit);

        if (!editValidity)
            return fail({ "type": "editValidity", "errors": Schema.errors() });

        exports.canAddSensorMulti(user, configuration, edit.sensors,
            this.next.bind(this, configuration),
            fail
        );
    }, function(configuration) {
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
            "uid": ObjectId(user['_id']).toString(),
            "time": Date.now(),
            "changes": edit
        });

        let completeValidity = Schema.validate('/Configuration', configuration);
        
        if (!completeValidity) return fail({
            "type": "completeValidity",
            "errors": Schema.errors()
        });
        
        // -----

        let configurations = Db.collection('configurations');

        configurations.updateOne(
            {'_id': ObjectId(cid) },
            newData,
            this.next.bind(this)
        );

    }, function(errUpdate, writeResult) {
        if (errUpdate || writeResult.result.ok != 1)
            return fail({
                "type": "write",
                "result": (writeResult || "").toString(),
                "error": errUpdate
            });
        
        success();
    });
}

exports.canAddSensor = function(user, configuration, sid, success, failure) {
    function fail(error) {
        Winston.debug("Cannot add sensor.", {
            "error": error
        });
        failure(error);
        return error;
    }
    
    sid = Utils.testOid(sid, fail);
    if (!sid) return;

    configuration.sensors.forEach((sensor) => {
        sensor = ObjectId(sensor);
        if (sid.equals(sensor)) return fail({
            "type": "duplicateSensor",
        });
    });

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

exports.canAddSensorMulti = function(user, configuration, sidArray, success, failure) {
    function fail(error) {
        Winston.debug('Could not add one or more sensors.', {
            "error": error,
            "sidArray": sidArray
        });
        failure(error);
        return error;
    }

    if (typeof sidArray == 'undefined' || sidArray.length == 0)
        return success();

    let responsesLeft = sidArray.length;
    let hasFailed = false;

    sidArray.forEach((sid) => {
        exports.canAddSensor(user, configuration, sid,
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

    // if (!result) configuration.members.some((member) => {
    //     result = userId.equals(ObjectId(member.uid));
    //     return result;
    // });

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

    sid = Utils.testOid(sid, fail);
    if (!sid) return;

    let data = { "sensors": [ sid.toString() ] };

    exports.edit(user, cid, data, success, fail);
};

/**
 * @param {array} reqs
 */
exports.mustachify = function(user, configuration, success, failure, needs = [], query) {
    function fail(error) {
        Winston.debug('Error preparing configuration for mustache.', {
            "error": error
        });
        failure(error);
    }
 
    // ----

    let hasFailed = false;
    let tasks = needs.length + 1;

    function progress() {
        Winston.debug('Progress made on Configurations.mustachify.');
        tasks--;
        if (tasks == 0) {
            Winston.debug('Configurations.mustachify succeeded.');
            success();
        }
    }

    // ----

    configuration.creation = Utils.prettyTime(
        configuration.creation, user.timezone
    );

    progress();
    
    // ----

    if (needs.includes('sensors')) {
        exports.getSensorList(configuration,
            (sensors) => {
                configuration.sensors = sensors;
                progress();
            },
            (error) => {
                if (!hasFailed) {
                    fail({ "type": "sensorList", "error": error });
                    hasFailed = true;
                }
            }
        );
    }

    // ----

    if (needs.includes('edits.time')) {
        configuration.edits.forEach((edit) => {
            edit.time = Utils.prettyTime(
                edit.time, user.timezone
            );
        });
        progress();
    }

    // ---

    if (needs.includes('user.sensors')) {
        Sensor.getList(user, 
            (docs) => { // Success
                user.sensors = docs;
                progress();
            },
            (error) => { // Failure
                fail({ "type": "userSensorList", "error": error });
            },
            ['name'] // Requirements
        );
    }

    // ----

    if (needs.includes('owner')) {
        Auth.findOid(configuration.owner,
            (owner) => {
                configuration.owner = owner;
                progress();
            },
            (error) => {
                fail({ "type": "configurationOwner", "error": error });
            },
            ['username']
        );
    }

    // ----

    if (needs.includes('readings')) {
        Reading.findConfiguration(configuration['_id'],
            (list) => {
                list.sort((a, b) => {
                    let timeA = parseInt(a.timeCreated);
                    let timeB = parseInt(b.timeCreated);
                    if (timeA < timeB) return -1;
                    if (timeA > timeB) return 1;
                    return 0;
                });
                list.forEach((obj, i) => {
                    list[i].timeCreated = Utils.prettyTime(obj.timeCreated, user.timezone);
                });
                configuration.readings = list;
                progress();
            },
            (error) => {
                fail({ "type": "configurationOwner", "error": error });
            },
            ['timeCreated']
        );
    }
}