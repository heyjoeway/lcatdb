const Schema = require('./schema.js');

const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId;
const merge = require('merge');

// ----------------------------------------------------------------------------

exports.getList = function(user, configurations, callback) {
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

// ----------------------------------------------------------------------------

exports.find = function(configurations, oid, success, failure) {
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

// ----------------------------------------------------------------------------

exports.new = function(user, configurations, callback) {
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
        // Run callback with the id string to the new configuration
        // as the parameter
        callback(result.ops[0]["_id"]);
    })
};

// ----------------------------------------------------------------------------

exports.edit = function(user, configurations, oid, edit, success, failure) {
    function fail(error) {
        Winston.debug("Failed to edit configuration.", {
            "username": user.username,
            "oid": oid.toString(),
            "edit": edit,
            "error": error
        });

        failure(error);
    }

    exports.find(configurations, oid,
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