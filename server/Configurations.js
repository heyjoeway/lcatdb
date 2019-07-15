const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId;
const deepmerge = require('deepmerge');

const Schema = require('./Schema');
const Db = require('./DBHandler');
const Sensor = require('./Sensors.js');
const Utils = require('./Utils');
const Chain = Utils.Chain;

/**
 * Gets a list of configurations associated with a given user.
 * 
 * @param {object} user - User object.
 * @param {function} callback - Callback to be run once configurations are found. Parameters are:
 *      - list: Array of configuration objects associated with user.
 */

exports.getList = function(user, success, failure, reqs) {
    function fail(error) {
        Winston.debug('Could not find configuration list for user.', {
            "error": error
        });
        if (failure) failure(error);
    }

    let cursor = Db.collection('configurations').find(
        { "owner": ObjectId(user["_id"]).toString() }, // Query
        Utils.reqsToObj(reqs) // Fields
    );

    cursor.toArray((error, list) => {
        if (error) return fail({
            "errorName": 'cursor',
            "errorName": 'Configurations.getList.cursor',
            "errorData": {
                "errorToArray": error
            }
        });

        Winston.debug(
            'Finished searching for configurations.',
            { "list": list }
        );

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

    Db.collection('configurations').findOne(
        { "_id": ObjectId(cid) }, // Query
        Utils.reqsToObj(reqs), // Fields
        (error, configuration) => {
            if ((error != null) || !Utils.exists(configuration)) {
                return fail({
                    "errorName": "find",
                    "errorNameFull": "Configruations.find.find",
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
    
        sensors.forEach(id => {
            Sensor.find(ObjectId(id),
                sensor => { // Success
                    if (hasFailed) return;
                    result.push(sensor)
                    this.next(result);
                },
                error => { // Failure
                    if (hasFailed) return;
                    fail(error);
                    hasFailed = true;                
                },
                reqs
            );
        });
    }, success);
};

/**
 * Creates a new Configuration in a collection and provides the new cid.
 * 
 * @param {object} user - User object.
 * @param {object} configurations - mongoDB collection object.
 * @param {function} callback - Callback to be run upon successful creation. Parameters are:
 *      - oid: ObjectId of the new configuration.
 */

exports.new = function(user, success, failure) {
    function fail(error) {
        Winston.error("Error saving new configuration to database.", {
            "error": error
        });
        failure(error);
    }

    let newConfiguration = Schema.defaults('/Configuration');
    
    [
        newConfiguration.owner,
        newConfiguration.creation
    ] = [
        ObjectId(user["_id"]).toString(),
        Date.now()
    ];

    Db.collection('configurations').save(newConfiguration, (error, result) => {
        if (error) return fail({
            "errorName": "save",
            "errorNameFull": "Configurations.new.save"
        });

        Winston.debug('Successfully registered new configuration.', {
            "newConfiguration": newConfiguration
        });

        // Run success with the oid of the new configuration as the parameter
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

/*
    ctx requirements:
    {
        user: [user object],
        cid: [configuration id],
        edit: [edit data],
        removeSensors: [array of sensor ids]
    }
*/

exports.edit = function(ctx, success, failure) {
    function fail(error) {
        Winston.debug("Failed to edit configuration.", {
            "error": error
        });

        failure(error);
    }

    let [
        user,
        cid,
        edit,
        removeSensors
    ] = [
        ctx.user,
        Utils.testOid(ctx.cid, fail),
        ctx.edit,
        ctx.removeSensors
    ];

    if (!cid) return; // Utils.testOid will throw error message
    if (!user) return fail({
        "errorName": "noUser",
        "errorNameFull": "Configurations.edit.noUser"
    });

    new Chain(function() {
        exports.find(cid,
            this.next.bind(this),
            error => fail({
                "errorName": "find",
                "errorNameFull": "Configurations.edit.find",
                "errorData": {
                    "errorFind": error
                }
            })
        );
    }, function(configuration) {
        let canEdit = exports.canEdit(user, configuration);
        if (!canEdit) return fail({
            "errorName": "canEdit",
            "errorNameFull": "Configurations.edit.canEdit"
        });

        if (typeof edit == 'undefined') {
            edit = {};
            return this.next(configuration);
        }

        let editValidity = Schema.validate('/ConfigurationEdit', edit);

        if (!editValidity) return fail({
            "errorName": "editValidity",
            "errorNameFull": "Configurations.edit.editValidity",
            "errorData": {
                "schemaErrors": Schema.errors() 
            }
        });

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

        let editLog = {
            "uid": ObjectId(user['_id']).toString(),
            "time": Date.now(),
            "changes": edit
        };

        if (removeSensors) {
            editLog.removeSensors = removeSensors;
            removeSensors.forEach(sid => {
                sid = Utils.testOid(sid);
                if (typeof sid == "undefined") return;

                let sidString = sid.toString();
                let sidIndex = configuration.sensors.indexOf(sidString);
                if (sidIndex > -1)
                    configuration.sensors.splice(sidIndex, 1);
            });
        }

        configuration.edits.push(editLog);

        let completeValidity = Schema.validate('/Configuration', configuration);
        
        if (!completeValidity) return fail({
            "errorName": "completeValidity",
            "errorNameFull": "Configurations.edit.completeValidity",
            "errorData": {
                "schemaErrors": Schema.errors()
            }
        });
        
        Db.collection('configurations').updateOne(
            {'_id': ObjectId(cid) },
            newData,
            this.next.bind(this)
        );
    }, function(errorUpdate, writeResult) {
        if (errorUpdate || writeResult.result.ok != 1)
            return fail({
                "errorName": "write",
                "errorNameFull": "Configurations.edit.write",
                "errorData": {
                    "errorUpdate": errorUpdate,
                    "result": (writeResult || "").toString(),
                }
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

    configuration.sensors.forEach(sensor => {
        sensor = ObjectId(sensor);
        if (sid.equals(sensor)) return fail({
            "errorName": "duplicateSensor",
            "errorNameFull": "Configurations.canAddSensor.duplicateSensor"
        });
    });

    Sensor.find(sid,
        sensor => {
            let ownerId = ObjectId(sensor.owner);
            let userId = ObjectId(user["_id"]);
            let idEquals = ownerId.equals(userId);

            if (!idEquals)
                return fail({
                    "errorName": "idMismatch",
                    "errorNameFull": "Configurations.canAddSensor.idMismatch"
                });

            success();
        },
        errorFind => fail({
            "errorName": "find",
            "errorNameFull": "Configurations.canAddSensor.find",
            "errorFind": errorFind
        })
    );
}

exports.canAddSensorMulti = function(user, configuration, sidArray, success, failure) {
    function fail(error) {
        Winston.debug('Could not add one or more sensors.', {
            "error": error,
            "sidArray": sidArray
        });
        
        failure(error);
    }

    if (typeof sidArray == 'undefined' || sidArray.length == 0)
        return success();

    let responsesLeft = sidArray.length;
    let hasFailed = false;

    sidArray.forEach(sid => {
        exports.canAddSensor(user, configuration, sid,
            () => {
                if (hasFailed) return;
                responsesLeft--;
                if (responsesLeft == 0) success();
            },
            error => {
                if (hasFailed) return;
                fail(error);
                hasFailed = true;
            }
        )
    });
}

/**
 * Tests if user is able to edit a configuration.
 * TODO: Replace with a more fleshed-out permission system.
 * 
 * @param {object} user - User object
 * @param {object} configuration - Configuration object
 * @returns {bool} result
 */

exports.canEdit = function(user, configuration) {
    if (!user) return false;
    let ownerId = ObjectId(configuration.owner);
    let userId = ObjectId(user["_id"]);
    let idEquals = ownerId.equals(userId);

    Winston.debug("Testing if user can edit this configuration.", {
        "username": user.username,
        "idEquals": idEquals,
        "ownerId": ownerId.toString(),
        "userId": userId.toString(),
        "configurationId": ObjectId(configuration['_id']).toString()
    });

    return idEquals;
};

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

    exports.edit(
        {
            "user": user,
            "cid": cid,
            "edit": { "sensors": [sid] }
        },
        success, fail
    );
};