// ============================================================================
// IMPORTS
// ============================================================================

const ObjectId = require('mongodb').ObjectId;
const Winston = require('winston');
const Bcrypt = require('bcrypt');

// ----------------------------------------------------------------------------
// Champy-DB specific modules
// ----------------------------------------------------------------------------

const Schema = require('./schema.js');
const Config = require('./config.json');
const Db = require('./db.js');

// ============================================================================
// FIND
// ============================================================================

/* Finds a user by username and/or email.
 *
 * username: Undefined if wanting to search by email.
 * email: Undefined if wanting to search by username.
 * success: Callback to be run upon successful find. Parameters are:
 *      - user: User object.
 * failure: Callback to be run if no user is found. Parameters are:
 *      - err: mongoDB error object.
 */

exports.find = function(username, email, success, failure) {
    let query = { "$or": [] }; 

    if (username) query["$or"].push({ "username": username });
    if (email) query["$or"].push({ "email": email });

    return exports.findQuery(query, success, failure);
}

/* Finds a user by object ID.
 *
 * oid: ObjectId object or string.
 * success: Callback to be run upon successful find. Parameters are:
 *      - user: User object.
 * failure: Callback to be run if no user is found. Parameters are:
 *      - err: mongoDB error object.
 */

exports.findOid = function(oid, success, failure) {
    return exports.findQuery({ "_id": ObjectId(oid) }, success, failure);
}

/* Finds a user by query.
 *
 * query: mongoDB query object.
 * success: Callback to be run upon successful find. Parameters are:
 *      - user: User object.
 * failure: Callback to be run if no user is found. Parameters are:
 *      - err: mongoDB error object.
 */

exports.findQuery = function(query, success, failure) {
    let users = Db.collection('users');

    users.findOne(query, (error, user) => {
        if (user == null || error != null) {
            Winston.debug("Could not find user.", {
                "query": query,
                "error": error
            });
            failure(error);
        } else {
            Winston.debug("Found user.", {
                "query": query,
                "oid": ObjectId(user['_id']).toString()
                // "user": user
            });
            success(user);
        }
    });
}

// ============================================================================
// REGISTRATION
// ============================================================================

/* Registers a user.
 * 
 * data: data used to create new user. Requires the following properties:
 *      - username
 *      - email
 *      - password
 *      - timezone
 * success: callback which is run on a successful registration. Parameters are:
 *      - oid: ObjectId of the new user.
 * failure: callback which is run on an unsuccessful registration. Parameters are:
 *      - errors: An array of errors, each with the following property:
 *          - type: String naming the type of error
 *      Other properties may be included depending on the error type.
 */

exports.register = function(data, success, failure) {

    function fail(errors) {
        Winston.debug("Failed to register user.", {
            "data": data,
            "errors": errors
        });
        failure(errors);
    }

    let users = Db.collection('users');

    let newUser = Schema.defaults('/User');

    [
        newUser.username,
        newUser.email,
        newUser.password,
        newUser.timezone,
        newUser.creation
    ] = [
        data.username,
        data.email,
        data.password,
        parseFloat(data.timezone),
        Date.now()
    ];
User
    let errors = [];
    let validity = Schema.validate('/User', newUser);

    let passwordMismatch = data.password != data.passwordRetype;
    if (passwordMismatch) errors.push({ "type": "passwordMismatch" });

    // Schema Validity/Password Mismatch
    if (!validity || passwordMismatch) {
        let validityErrors = Schema.errors() || [];
        let properties = [];
        validityErrors.forEach(function(value) {
            // Grab the actual property name instead of ".<property>"
            properties.push(value.dataPath.split('.')[1]);
        });
        errors.push({
            "type": "validity",
            "properties": properties,
            "validityErrors": validityErrors
        });

        fail(errors);
        return;
    }

    // Username/email conflict
    exports.find(newUser.username, newUser.email,
        () => { // User found
            errors.push({ "type": "taken" });
            fail(errors);
            return;
        },
        () => { // User not found
            Bcrypt.hash(newUser.password, Config.salt.rounds, (errHash, hash) => {
                if (errHash) {
                    errors.push({ "type": "hash", "errHash": errHash });
                    fail(errors);
                    return;
                }

                newUser.password = hash;

                // Saving to db
                users.insertOne(newUser, (errSave, result) => {
                    if (errSave) {
                        errors.push({ "type": "save", "errSave": errSave });
                        fail(errors);
                        return;
                    }

                    let oid = result.insertedId;

                    Winston.debug('Successfully registered new user.', {
                        "username": newUser.username,
                        "email": newUser.email,
                        "oidString": oid.toString()
                    });

                    success(oid);
                });
            });
        }
    );
};

// ============================================================================
// LOGIN
// ============================================================================

/* Validates a correct username and password combination.
 * Does not affect session.
 * 
 * username: Username of user.
 * password: Password of user. (Not hash)
 * success: Callback to be run upon successful validation. Parameters are:
 *      - oid: ObjectId of resulting user.
 * failure: Callback to be run in case of error. Parameters are:
 *      - error: Object containing information about the error. Parameters are:
 *          - type: String describing type of error.
 *      Can also conatin additional properties depending on the type.
 */

exports.login = function(username, password, success, failure) {
    let users = Db.collection('users');

    function fail(error) {
        failure(error)
    }

    exports.find(username, undefined,
        (user) => { // User found
            Bcrypt.compare(password, user.password, function(err, result) {
                if (result) { // Pasword valid
                    let oid = ObjectId(user["_id"]);
                    success(oid);
                    return;
                }

                fail({ "type": "password" }); // Password invalid
            });
        },
        (error) => { // User not found
            fail({ "type": "username", "error": error });
        }
    );
};