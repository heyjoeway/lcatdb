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

// ============================================================================
// FIND
// ============================================================================

/* Finds a user by username and/or email.
 *
 * users: mongoDB collection object.
 * username: Undefined if wanting to search by email.
 * email: Undefined if wanting to search by username.
 * success: Callback to be run upon successful find. Parameters are:
 *      - user: User object.
 * failure: Callback to be run if no user is found. Parameters are:
 *      - err: mongoDB error object.
 */

exports.find = function(users, username, email, success, failure) {
    let query = { "$or": [] }; 

    if (username) query["$or"].push({ "username": username });
    if (email) query["$or"].push({ "email": email });

    return exports.findQuery(users, query, success, failure);
}

/* Finds a user by object ID.
 *
 * users: mongoDB collection object.
 * oid: ObjectId object or string.
 * success: Callback to be run upon successful find. Parameters are:
 *      - user: User object.
 * failure: Callback to be run if no user is found. Parameters are:
 *      - err: mongoDB error object.
 */

exports.findOid = function(users, oid, success, failure) {
    return exports.findQuery(users, { "_id": ObjectId(oid) }, success, failure);
}

/* Finds a user by query.
 *
 * users: mongoDB collection object.
 * query: mongoDB query object.
 * success: Callback to be run upon successful find. Parameters are:
 *      - user: User object.
 * failure: Callback to be run if no user is found. Parameters are:
 *      - err: mongoDB error object.
 */

exports.findQuery = function(users, query, success, failure) {
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
                "user": user
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
 * users: mongoDB collection object.
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

exports.register = function(users, data, success, failure) {
    function fail(errors) {
        Winston.debug("Failed to register user.", {
            "data": data,
            "errors": errors
        });
        failure(errors);
    }

    let newUser = Schema.defaults("User");
    let errors = [];

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

    let validity = Schema.validate('User', newUser);

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
    exports.find(users, newUser.username, newUser.email,
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
                        "oidString": oid.toString(),
                        "oid": oid
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
 * users: mongoDB collection object.
 * username: Username of user.
 * password: Password of user. (Not hash)
 * success: Callback to be run upon successful validation. Parameters are:
 *      - oid: ObjectId of resulting user.
 * failure: Callback to be run in case of error. Parameters are:
 *      - error: Object containing information about the error. Parameters are:
 *          - type: String describing type of error.
 *      Can also conatin additional properties depending on the type.
 */

exports.login = function(users, username, password, success, failure) {
    function fail(error) {
        failure(error)
    }

    exports.find(users, username, undefined,
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