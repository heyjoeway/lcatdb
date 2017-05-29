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

exports.find = function(configurations, id, success, failure) {
    configurations.findOne(
        {'_id': ObjectId(id) },
        (err, configuration) => {
            if (err || configuration == null) {
                Winston.warn('Error finding configuration.', {
                    "configuration": configuration,
                    "errInternal": err,
                    "id": id
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

exports.edit = function(user, configurations, id, data, success, failure) {
    function fail(err) {
        Winston.debug("Failed to edit configuration.", {
            "username": user.username,
            "id": id,
            "data": data
        });

        failure(err);
    }

    exports.find(id, configurations,
        (configuration) => {
            let canEdit = exports.canEdit(user, configuration);
            if (!canEdit) {
                fail({ "type": "canEdit" });
                return;
            }

            // -----

            let idOverwrite = newData.hasOwnProperty("_id") &&
                ObjectId(newData["_id"]) != ObjectId(configuration["_id"]);
            if (idOverwrite) {
                fail({ "type": "idOverwrite" });
                return;
            }

            // -----

            let newData = merge.recursive(configuration, data);
            let validity = Schema.validate('Configuration', configuration);
            
            if (!validity) {
                fail({ "type": "validity", "data": Schema.errors() });
                return;
            }
            
            // -----

            let writeResult = configurations.update({'_id': ObjectId(id) }, newData);

            if (writeResult.hasWriteConcernError()) {
                fail({ "type": "write", "data": writeResult });
                return;
            }

            // -----

            success();
        },
        (err) => { fail({ "type": "find", "data": err }) }
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
        "ownerId": ownerId,
        "userId": userId,
        "configuration": configuration
    });

    return result;
};

