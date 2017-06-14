const deepmerge = require('deepmerge');
const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId;

const Schema = require('./schema.js');
const SensorTypes = require('./sensorTypes.js')
const Configurations = require('./configurations.js');
const Db = require('./db.js');

exports.find = function(oid, success, failure) {
    function fail(error) {
        Winston.debug('Error finding reading.', {
            "error": error,
            "oidString": oid.toString()
        });
        failure(error);
        return error;
    }
    
    try { oid = ObjectId(oid); }
    catch(e) { return fail({ "type": "badId", "exception": e }); }


    let readings = Db.collection('readings');

    readings.findOne(
        { "_id": oid },
        (error, reading) => {
            if (error || reading == null)
                return fail({ "type": "notFound", "error": error });

            Winston.debug("Reading found successfully.", {
                "oidString": oid.toString()
            });

            success(reading);
        }
    );
}

exports.new = function(user, configuration, data, success, failure, publish) {
    function fail(error) {
        Winston.debug("Could not create new reading.", {
            "error": error
        });
        failure(error);
        console.log(newData);
    }

    let canEdit = Configurations.canEdit(user, configuration);
    if (!canEdit) return fail({ "type": "canEdit" });

    let newData = deepmerge(
        data,
        Schema.defaults('/Reading')
    );

    [
        newData.configuration,
        newData.creator,
        newData.publisher,
        newData.published,
        newData.timePublished
    ] = [
        ObjectId(configuration["_id"]),
        ObjectId(user["_id"]),
        ObjectId(user["_id"]),
        true,
        Date.now()
    ];

    let readingValidity = Schema.validate('/Reading', newData);
    if (!readingValidity)
        return fail({ "type": "readingValidity", "errors": Schema.errors() });
    
    let valueValidity;
    data.values.some((val) => {
        valueValidity = Schema.validate(
            SensorTypes.getSchemaId(val.type),
            val.data            
        );

        return valueValidity;
    });
    
    if (!valueValidity)
        fail({ "type": "valueValidity", "errors": Schema.errors() });
    
    let readings = Db.collection('readings');

    readings.save(newData, (error, result) => {
        if (error) return fail({ "type": "readingSave", "error": error });

        let rid = ObjectId(result.ops[0]["_id"]);

        Winston.debug('Successfully created new reading.', {
            "ridString": rid.toString()
        });

        success(rid);
    });
}