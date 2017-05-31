// ============================================================================
// IMPORTS
// ============================================================================

const MongoClient = require('mongodb').MongoClient;
const Winston = require('winston');

// ----------------------------------------------------------------------------
// Champy-DB specific modules
// ----------------------------------------------------------------------------

const Config = require('./config.json');

// ============================================================================

let db;

exports.index = function() {
    let users = db.collection('users');
    // let configurations = db.collection('configurations');
    
    users.ensureIndex('username');
}

exports.connect = function(success, failure) {
    function fail(error) {
        Winston.error('Could not connect to database.', {
            "error": error
        });

        failure(error);
    }

    MongoClient.connect(
        Config.db.uri,
        (error, database) => {
            if (error) {
                fail({ "type": "connect", "error": errorv });
                return;
            }  

            db = database;
            exports.index();

            success();
        }
    );
}

exports.collection = function(name) {
    return db.collection(name);
};