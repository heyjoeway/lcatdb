// ============================================================================
// IMPORTS
// ============================================================================

const deepmerge = require('deepmerge');
const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId;

// ----------------------------------------------------------------------------
// Champy-DB specific modules
// ----------------------------------------------------------------------------

const Schema = require('./schema.js');
const Sensor = require('./sensor.js');
const SensorTypes = require('./sensorTypes.js')
const Configurations = require('./configurations.js');
const Db = require('./DBHandler.js');
const Utils = require('./utils.js');
const Chain = Utils.Chain;

// ----------------------------------------------------------------------------

exports.find = function(oid, success, failure, reqs) {
    function fail(error) {
        Winston.debug('Error finding reading.', {
            "error": error,
            "oidString": oid.toString()
        });
        failure(error);
    }
    
    // ----

    oid = Utils.testOid(oid, fail);
    if (!oid) return;

    // ----

    let readings = Db.collection('readings');

    let fields = Utils.reqsToObj(reqs);

    readings.findOne(
        { "_id": oid },
        fields,
        (errorFind, reading) => {
            if (errorFind || reading == null)
                return fail({
                    "errorName": "notFound",
                    "errorNameFull": "Reading.find.notFound",
                    "errorData": {
                        "errorFind": errorFind
                    }
                });

            Winston.debug("Reading found successfully.", {
                "oidString": oid.toString()
            });

            success(reading);
        }
    );
}

exports.findQuery = function(query, success, failure) {
    function fail(error) {
        Winston.debug('Could not process query.', {
            "error": error
        });
        failure(error);
    }

    let queryValidity = Schema.validate('/Query', query);
    
    if (!queryValidity) return fail({
        "errorName": "queryValidity",
        "errorNameFull": "Reading.findQuery.queryValidity",
        "errorData": {
            "schemaErrors": Schema.errors()
        }
    }); 

    let [page, pageSize] = [
        query.page || 1,
        query.pageSize || 0,
    ];

    let cursor = (
        Db.collection('readings')
            .find(query.filter, query.fields)
            .sort(query.sort)
            .skip((page - 1) * pageSize)
            .limit(pageSize)
    );

    cursor.toArray(function(error, list) {
        if (error) return fail({
            "errorName": "toArray",
            "errorNameFull": "Reading.findQuery.toArray",
            "errorData": {
                "errorToArray": error
            }
        });

        Winston.debug('Finished searching for readings.', {
            "list": list
        });
        success(list);
    });
};

exports.findConfiguration = function(cid, success, failure, reqs) {
    function fail(error) {
        Winston.debug('Could not find reading by configuration.', {
            "error": error
        });
        failure(error);
    }

    cid = Utils.testOid(cid, fail);
    if (!cid) return;

    return exports.findQuery({
        "filter": { "configuration": cid.toString() },
        "fields": Utils.reqsToObj(reqs),
        "sort": [['_id', -1]]
    }, success, failure);
};

// ----------------------------------------------------------------------------

exports.validate = function(reading) {
    function fail(error) {
        Winston.debug("Failed to validate reading.", {
            "error": error
        });
        return error;
    }

    let readingValidity = Schema.validate('/Reading', reading);
    if (!readingValidity)
        return fail({
            "errorName": "readingValidity",
            "errorNameFull": "Reading.validate.readingValidity",
            "errorData": {
                "schemaErrors": Schema.errors()
            }
        });
    
    if (Utils.exists(reading.values)) {
        let valueValidity;
        reading.values.some((val) => {
            valueValidity = Schema.validate(
                SensorTypes.getSchemaId(val.type),
                val.data            
            );

            return valueValidity;
        });
        
        if (!valueValidity)
            return fail({
                "errorName": "valueValidity",
                "errorNameFull": "Reading.validate.valueValidity",
                "errorData": {
                    "schemaErrors": Schema.errors()
                }
            });
    }
}

exports.new = function(ctx, success, failure) {
    function fail(error) {
        Winston.debug("Could not create new reading.", {
            "error": error
        });
        failure(error);
    }

    // ----

    [
        user,
        configuration,
        cid,
        reading
    ] = [
        ctx.user,
        ctx.configuration,
        ctx.cid,
        ctx.reading
    ];

    // ----

    if (typeof user != "object")
        return fail({
            "errorName": "noUser",
            "errorNameFull": "Reading.new.noUser"
        });

    // ----
    
    if (configuration && configuration["_id"])
    cid = configuration["_id"];
    
    cid = Utils.testOid(cid, fail);
    if (!cid) return;
    
    // ----

    if (!Configurations.canEdit(user, configuration))
        return fail({
        "errorName": "canEdit",
            "errorNameFull": "Reading.new.canEdit"
        });

    // ----
    
    let creatorId = Utils.testOid(user["_id"], fail);
    if (!creatorId) return;    
    
    // ----

    let hasFailed = false;
    new Chain(function() {
        try {
            this.pause(reading.values.length);
            this.next();

            reading.values.forEach((value) => {
                if (hasFailed) return;
                let sid = value.sensor;
                Sensor.find(sid,
                    (sensor) => {
                        if (hasFailed) return;
                        if (sensor.type != value.type) {
                            fail({
                                "errorName": "sensorFind",
                                "errorNameFull": "Reading.new.sensorType"
                            });
                            hasFailed = true;
                            return;
                        }

                        this.next();
                    },
                    (error) => {
                        if (hasFailed) return;
                        fail({
                            "errorName": "sensorFind",
                            "errorNameFull": "Reading.new.sensorFind",
                            "errorData": {
                                "errorFind": error
                            }
                        });
                        hasFailed = true;
                    }
                );
            });
        } catch (e) {
            fail({
                "errorName": "process",
                "errorNameFull": "Reading.new.process"
            });
        }
    }, function() {
        let newData = deepmerge(
            reading,
            Schema.defaults('/Reading')
        );
    
        [
            newData.configuration,
            newData.creator,
            newData.publisher,
            newData.published,
            newData.timePublished
        ] = [
            cid.toString(),
            creatorId.toString(),
            creatorId.toString(),
            true,
            Date.now()
        ];
    
        let validityError = exports.validate(newData);
        if (validityError) return fail(validityError);
    
        Db.collection('readings').save(newData, (error, result) => {
            if (error) return fail({
                "errorName": "readingSave",
                "errorNameFull": "Reading.new.readingSave",
                "errorData": {
                    "errorSave": error
                }
            });
    
            let rid = ObjectId(result.ops[0]["_id"]);
    
            Winston.debug('Successfully created new reading.', {
                "ridString": rid.toString()
            });
    
            success(rid);
        });
    });
}