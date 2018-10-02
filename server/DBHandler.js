const MongoClient = require('mongodb').MongoClient;
const Winston = require('winston');

// Champy-DB specific modules
const Config = require('./config.json');

/**
 * Connect to mongoDB database as specified in Config.
 * Sets DBHandler.db to database instance.
 *
 * @param {genericSuccess} success Callback to be run upon successful find.
 * @param {genericFailure} failure Callback to be run if no user is found.
 */
exports.connect = function(success, failure) {
    function fail(error) {
        Winston.error('Could not connect to database.', {
            "error": error
        });

        failure(error);
    }

    MongoClient.connect(
        Config.db.uri,
        (errorConnect, database) => {
            if (errorConnect) return fail({
                "errorName": "connect",
                "errorNameFull": "Db.connect.connect",
                "errorData": {
                    "errorConnect": errorConnect
                }
            });

            exports.db = database;
            exports.ensureIndexes();
            success();
        }
    );
}

/**
 * Ensures indexes are generated for collections.
 * Not necessary for operation, but should improve speed.
 */
exports.ensureIndexes = function() {
    let users = exports.collection('users');

    users.ensureIndex('username');
    users.ensureIndex('email');
}

/**
 * Shim for DBHandler.db.collection.
 *
 * @param {string} name Collection name
 */
exports.collection = function(name) {
    return exports.db.collection(name);
};