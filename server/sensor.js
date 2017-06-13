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
const Configurations = require('./configurations.js');
const Db = require('./db.js');
const SensorTypes = require('./sensorTypes.js');

/** 
 * Tests if a user can edit a certain sensor.
 * 
 * @param {object} user
 * @param {object} sensor
 */

exports.canEdit = function(user, sensor) {
    let ownerId = ObjectId(sensor.owner);
    let userId = ObjectId(user["_id"]);
    let result = ownerId.equals(userId);

    // if (!result) configuration.members.some((member) => {
    //     result = userId.equals(ObjectId(member.uid));
    //     return result;
    // });

    Winston.debug("Testing if user can edit this sensor.", {
        "username": user.username,
        "result": result,
        "ownerId": ownerId.toString(),
        "userId": userId.toString(),
        "sensorId": ObjectId(sensor['_id']).toString()
    });

    return result;
};

/**
 * Finds a Sensor by object ID.
 *
 * @param {(object|string)} oid - ObjectId object or string.
 * @param {function} success - Callback to be run upon successful find. Parameters are:
 *      - sensor: Sensor object.
 * @param {function} failure - Callback to be run if no sensor is found. Parameters are:
 *      - err: mongoDB error object.
 */

exports.find = function(oid, success, failure) {
    function fail(error) {
        Winston.debug('Error finding sensor.', {
            "error": error,
            "oidString": oid.toString()
        });
        failure(error);
        return error;
    }
    
    try { oid = ObjectId(oid); }
    catch(e) { return fail({ "type": "badId", "exception": e }); }


    let sensors = Db.collection('sensors');

    sensors.findOne(
        { "_id": oid },
        (error, sensor) => {
            if (error || sensor == null)
                return fail({ "type": "notFound", "error": error });

            Winston.debug("Sensor found successfully.", {
                "oidString": oid.toString()
            });

            success(sensor);
        }
    );
}

/**
 * Creates a new Sensor.
 * 
 * @param {object} user
 * @param {object} data
 * @param {object|string} cid - Configuration id
 * @param {function} success
 * @param {function} failure - Parameters are:
 *      - errors: Array of objects containing error information.
 * 
 */
exports.new = function(user, data, cid, success, failure) {
    function fail(errors) {
        Winston.debug('Could not create new sensor.', {
            "errors": errors
        });
        failure(errors);
    }

    let type = data.type;
    if (!SensorTypes.isValidType(type))
        return fail({ "type": "invalidType" });

    // ---

    let newSensor = Schema.defaults('/Sensor');

    [
        newSensor.owner,
        newSensor.type
    ] = [
        ObjectId(user["_id"]),
        type
    ];

    let validity = Schema.validate('/Sensor', newSensor);

    if (!validity) {
        let validityErrors = Schema.errors() || [];
        let properties = [];
        validityErrors.forEach(function(value) {
            // Grab the actual property name instead of ".<property>"
            properties.push(value.dataPath.split('.')[1]);
        });
        errors.push({
            "type": "sensorValidity",
            "properties": properties,
            "validityErrors": validityErrors
        });

        fail(errors);
        return;
    }

    // ---    

    let sensors = Db.collection('sensors');
    sensors.insertOne(newSensor, (errSave, result) => {
        if (errSave) {
            errors.push({ "type": "sensorSave", "errSave": errSave });
            fail(errors);
            return;
        }

        let oid = result.insertedId;

        Winston.debug('Successfully registered new sensor.', {
            "oidString": oid.toString()
        });

        if (typeof cid == "undefined") return success(oid);

        Configurations.edit(user, cid, { "sensors": [ oid ] },
            () => { success(oid); }, failure
        );
    });
};

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
        Winston.debug("Failed to edit sensor.", {
            "username": user.username,
            "oid": (oid || "").toString(),
            "edit": edit,
            "error": error
        });

        failure(error);
    }

    try { oid = ObjectId(oid); }
    catch(e) { return fail({ "type": "badId", "exception": e }); }

    let sensors = Db.collection('sensors');

    exports.find(oid,
        (sensor) => {
            let canEdit = exports.canEdit(user, sensor);
            if (!canEdit) {
                fail({ "type": "canEdit" });
                return;
            }

            // -----

            let editValidity = Schema.validate('/SensorEdit', edit);
            
            if (!editValidity) {
                fail({ "type": "editValidity", "errors": Schema.errors() });
                return;
            }

            // -----

            let newData = deepmerge(sensor, edit, {
                arrayMerge: (dest, src) => { return dest.concat(src) }
            });

            sensor.edits.push({
                "uid": ObjectId(user['_id']),
                "time": Date.now(),
                "changes": edit
            });

            // -----

            let completeValidity = Schema.validate('/Sensor', sensor);
            
            if (!completeValidity) {
                fail({ "type": "completeValidity", "errors": Schema.errors() });
                return;
            }
            
            // -----

            sensors.updateOne({'_id': ObjectId(oid) }, newData,
                (errUpdate, writeResult) => {
                    if (errUpdate || writeResult.result.ok != 1) {
                        return fail({
                            "type": "write",
                            "result": (writeResult || "").toString(),
                            "error": errUpdate
                        });
                    }
                    
                    success();
                }
            );
        },
        (error) => { fail({ "type": "find", "error": error }) }
    );
}