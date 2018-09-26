const MongoClient = require('mongodb').MongoClient;
const Winston = require('winston');

// Champy-DB specific modules
const Config = require('./config.json');

class DBHandler {
    /**
     * Connect to mongoDB database as specified in Config.
     * Sets DBHandler.db to database instance.
     *
     * @param {genericSuccess} success Callback to be run upon successful find.
     * @param {genericFailure} failure Callback to be run if no user is found.
     */
    static connect(success, failure) {
        function fail(error) {
            Winston.error('Could not connect to database.', {
                "error": error
            });
    
            failure(error);
        }
    
        MongoClient.connect(
            Config.db.uri,
            (errorConnect, database) => {
                if (errorConnect)
                    return fail({
                        "errorName": "connect",
                        "errorNameFull": "Db.connect.connect",
                        "errorData": {
                            "errorConnect": errorConnect
                        }
                    });
    
                DBHandler.db = database;
                DBHandler.ensureIndexes();
                success();
            }
        );
    }

    /**
     * Ensures indexes are generated for collections.
     * Not necessary for operation, but should improve speed.
     */
    static ensureIndexes() {
        let users = DBHandler.collection('users');

        users.ensureIndex('username');
        users.ensureIndex('email');
    }

    /**
     * Shim for DBHandler.db.collection.
     *
     * @param {string} name Collection name
     */
    static collection(name) {
        return DBHandler.db.collection(name);
    };
}

module.exports = DBHandler;


