const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId;
const deepmerge = require('deepmerge');

const Utils = require('./Utils.js');
const Schema = require('./Schema.js');
const Configurations = require('./configurations.js');
const Db = require('./DBHandler.js');
const SensorTypes = require('./SensorTypes.js');

class Sensors {
    /**
     * @callback sensorsGetListSuccessCallback
     * @param {object[]} sensors 
     */
    /**
     * @callback sensorsGetListFailureCallback
     * @param {object} error 
     */
    /**
     * Finds a Sensor by object ID.
     *
     * @param {object} user User object from DB.
     * @param {sensorsGetListSuccessCallback} success 
     * @param {sensorsGetListFailureCallback} failure
     * @param {array} reqs
     */
    static getList(user, success, failure, reqs) {
        function fail(error) {
            Winston.debug('Could not retrieve sensor list.', {
                "error": error
            });
            failure(error)
        }

        // Validate user ID
        let oid = Utils.testOid(user['_id'], fail);
        if (!oid) return;

        // Build request
        let query = { "owner": ObjectId(user["_id"]).toString() };
        let fields = Utils.reqsToObj(reqs);

        let cursor = Db.collection('sensors').find(query, fields);
        cursor.toArray((error, sensors) => {
            if (error) return fail({
                "errorName": "cursor",
                "errorNameFull": "Sensor.getList.cursor",
                "errorData": {
                    "errorToArray": error
                }
            });

            Winston.debug(
                'Finished searching for sensors.',
                { "username": user.username }
            );
            success(sensors);
        });
    };

    /** 
     * Tests if a user can edit a certain sensor.
     * Users should only be able to edit a sensor if they are the owner.
     * This may be replaced using a full-fledged permissions system at some point.
     * 
     * @param {object} user
     * @param {object} sensor
     * @returns {boolean}
     */
    static canEdit(user, sensor) {
        if ((typeof user == 'undefined') || (typeof sensor == 'undefined'))
            return false;

        let ownerId = ObjectId(sensor.owner);
        let userId = ObjectId(user["_id"]);
        let result = ownerId.equals(userId);

        Winston.debug("Testing if user can edit a sensor.", {
            "username": user.username,
            "result": result,
            "ownerId": ownerId.toString(),
            "userId": userId.toString(),
            "sensorId": ObjectId(sensor['_id']).toString()
        });

        return result;
    };

    /**
     * @callback sensorsFindSuccessCallback
     * @param {object} sensor 
     */
    /**
     * @callback sensorsFindFailureCallback
     * @param {object} mongoError 
     */
    /**
     * Finds a Sensor by object ID.
     *
     * @param {(object|string)} oid - ObjectId object or string.
     * @param {sensorsFindSuccessCallback} success 
     * @param {sensorsFindFailureCallback} failure
     * @param {array} reqs
     */
    static find(oid, success, failure, reqs) {
        function fail(error) {
            Winston.debug('Error finding sensor.', {
                "error": error,
                "oidString": oid.toString()
            });
            failure(error);
            return error;
        }
        
        // Validate user ID
        oid = Utils.testOid(oid, fail);
        if (!oid) return;

        Db.collection('sensors').findOne(
            { "_id": oid }, // query
            Utils.reqsToObj(reqs), // fields
            (error, sensor) => {
                if (error || sensor == null) return fail({
                    "errorName": "notFound",
                    "errorNameFull": "Sensor.find.notFound",
                    "errorData": {
                        "errorFind": error
                    }
                });

                Winston.debug("Sensor found successfully.", {
                    "oidString": oid.toString()
                });

                success(sensor);
            }
        );
    }

    /**
     * Validates a sensor and provides a proper error if invalid.
     *
     * @param {object} sensor Sensor object from DB.
     * @returns {{boolean|object}} Either true if valid or an error object if invalid.
     */
    static validate(sensor) {
        let validity = Schema.validate('/Sensor', sensor);

        if (validity) return true;
        let validityErrors = Schema.errors() || [];
        let properties = [];
        validityErrors.forEach(value =>
            // Grab the actual property name instead of ".<property>"
            properties.push(value.dataPath.split('.')[1])
        );

        return {
            "errorName": "sensorValidity",
            "errorNameFull": "Sensor.new.sensorValidity",
            "errorData": {
                "properties": properties,
                "validityErrors": validityErrors
            }
        };
    }

    /**
     * @callback sensorsNewSuccessCallback
     * @param {ObjectId} sid 
     */
    /**
     * @callback sensorsNewFailureCallback
     * @param {object} error
     */
    /**
     * Creates a new Sensor.
     * 
     * @param {object} user
     * @param {object} data
     * @param {object|string} cid - Configuration id
     * @param {sensorsNewSuccessCallback} success
     * @param {sensorsNewFailureCallback} failure
     */
    static new(user, data, cid, success, failure) {
        function fail(error) {
            Winston.debug('Could not create new sensor.', {
                "error": error
            });
            failure(error);
        }
        
        let type = data.type;
        if (!Object.keys(SensorTypes.types).includes(type))
            return fail({
                "errorName": "invalidType",
                "errorNameFull": "Sensor.new.invalidType"
            });

        // Start with blank sensor from schema defaults
        // See ./schema/sensor.json
        let newSensor = Schema.defaults('/Sensor');

        // Set properties
        [
            newSensor.owner,
            newSensor.type,
            newSensor.model,
            newSensor.creation
        ] = [
            ObjectId(user["_id"]).toString(),
            type,
            data.model || '',
            Date.now()
        ];

        // Validation
        let validateResult = Sensors.validate(newSensor);
        if (validateResult != true) // Needs to be verbose
            return fail(validateResult);

        Db.collection('sensors').insertOne(
            newSensor,
            (errSave, result) => {
                if (errSave) return fail({
                    "errorName": "sensorSave",
                    "errorNameFull": "Sensor.new.sensorSave",
                    "errorData": {
                        "errorSave": errSave
                    }
                });

                let sid = result.insertedId;

                Winston.debug(
                    'Successfully registered new sensor.',
                    { "sidString": sid.toString() }
                );

                if (!Utils.exists(cid)) return success(sid);

                Configurations.edit(
                    {
                        "user": user,
                        "cid": cid,
                        "edit": { "sensors": [ sid.toString() ] }
                    },
                    () => success(sid),
                    () => failure()
                );
            }
        );
    };

    /**
     * @callback sensorsEditSuccessCallback
     * @param {ObjectId} sid 
     */
    /**
     * @callback sensorsEditFailureCallback
     * @param {array} errors 
     */
    /**
     * Edits a Sensor in the collection.
     * TODO: Push edit history using a mongoDB push and not pulling the whole log
     * each time.
     * 
     * @param {object} user User object.
     * @param {(object|string)} sid ObjectId object or string of the Sensor to edit.
     * @param {object} edit Data to edit the Sensor with. (See ./schema/sensorEdit.json)
     * @param {sensorsEditSuccessCallback} success
     * @param {sensorsEditFailureCallback} failure
     */
    static edit(user, sid, edit, success, failure) {
        function fail(error) {
            Winston.debug("Failed to edit sensor.", {
                "sid": sid,
                "edit": edit,
                "error": error
            });

            failure(error);
        }

        // Test sid for validity
        sid = Utils.testOid(sid, fail);
        if (!sid) return;

        new Utils.Chain(function() {
            Sensors.find(
                sid,
                this.next.bind(this),
                error => fail({
                    "errorName": "find",
                    "errorNameFull": "Sensor.edit.find",
                    "errorData": {
                        "errorFind": error
                    }
                })
            );
        }, function(sensor) {
            let canEdit = Sensors.canEdit(user, sensor);
            if (!canEdit) return fail({
                "errorName": "canEdit",
                "errorNameFull": "Sensor.edit.canEdit"
            });

            // -----

            let editValidity = Schema.validate('/SensorEdit', edit);
            if (!editValidity) return fail({
                "errorName": "editValidity",
                "errorNameFull": "Sensor.edit.editValidity",
                "errorData": {
                    "schemaErrors": Schema.errors()
                }
            });

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
            if (!completeValidity) return fail({
                "errorName": "completeValidity",
                "errorNameFull": "Sensor.edit.completeValidity",
                "errorData": {
                    "schemaErrors": Schema.errors()
                }
            });
            
            // -----

            Db.collection('sensors').updateOne(
                {'_id': ObjectId(sid) },
                newData,
                this.next.bind(this)
            );
        }, function(errUpdate, writeResult) {
            if (errUpdate || writeResult.result.ok != 1)
                return fail({
                    "errorName": "write",
                    "errorNameFull": "Sensor.edit.write",
                    "errorData": {
                        "result": (writeResult || "").toString(),
                        "errorUpdate": errUpdate
                    }
                });
            
            success();
        });
    }
}

module.exports = Sensors;