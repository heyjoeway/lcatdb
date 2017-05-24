const Schema = require('./schema.js');

const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId;

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

exports.new = function(user, configurations, callback) {
    let newConfiguration = Schema.defaultsKey("configuration");
    
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

