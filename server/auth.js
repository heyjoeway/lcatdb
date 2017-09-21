// ============================================================================
// IMPORTS
// ============================================================================

const ObjectId = require('mongodb').ObjectId;
const Winston = require('winston');
const Bcrypt = require('bcrypt');
const hat = require('hat');

// ----------------------------------------------------------------------------
// Champy-DB specific modules
// ----------------------------------------------------------------------------

const Schema = require('./schema.js');
const Config = require('./config.json');
const Db = require('./db.js');
const Utils = require('./utils.js');
const Chain = Utils.Chain;

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

exports.find = function(username, email, success, failure, reqs) {
    let query = { "$or": [] }; 

    if (username) query["$or"].push({ "username": username });
    if (email) query["$or"].push({ "email": email });

    return exports.findQuery({
       "filter": query,
       "fields": Utils.reqsToObj(reqs)
    }, success, failure);
};

/* Finds a user by object ID.
 *
 * oid: ObjectId object or string.
 * success: Callback to be run upon successful find. Parameters are:
 *      - user: User object.
 * failure: Callback to be run if no user is found. Parameters are:
 *      - err: mongoDB error object.
 */

exports.findOid = function(oid, success, failure, reqs) {
    function fail(error) {
        Winston.debug('Could not find user by id.', {
            "error": error,
            "oid": oid
        });
        failure(error);
    }

    oid = Utils.testOid(oid, fail);
    if (!oid) return;

    return exports.findQuery({
       "filter": { "_id": oid },
       "fields": Utils.reqsToObj(reqs)
    }, success, fail);
};

/* Finds a user by query.
 *
 * query: mongoDB query object.
 * success: Callback to be run upon successful find. Parameters are:
 *      - user: User object.
 * failure: Callback to be run if no user is found. Parameters are:
 *      - err: mongoDB error object.
 */

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
        "errorData": {
            "schemaErrors": Schema.errors()
        }
    });

    let [
        filter,
        fields
    ] = [
        query.filter,
        query.fields
    ];

    try {
        Db.collection('users').findOne(filter, fields, (error, user) => {
            if (user == null || error != null) return fail({
                "errorName": "notFound",
                "error": error                 
            });
            
            Winston.debug("Found user.", {
                "fields": fields,
                "filter": filter
            });
            success(user);
        });
    } catch(e) {
        fail({
            "errorName": "exception"
        });
    }
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
    new Chain(function() {
        exports.find(newUser.username, newUser.email,
            () => { // User found
                errors.push({ "type": "taken" });
                fail(errors);
            },
            this.next.bind(this)
        );
    }, function() { // User not found
        Bcrypt.hash(
            newUser.password,
            Config.salt.rounds,
            this.next.bind(this)
        );
    }, function(errHash, hash) {
        if (errHash) {
            errors.push({ "type": "hash", "errHash": errHash });
            fail(errors);
            return;
        }

        newUser.password = hash;

        users.insertOne(newUser,  this.next.bind(this));
    }, function(errSave, result) {
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

    // exports.find(newUser.username, newUser.email,
    //     () => { // User found
    //         errors.push({ "type": "taken" });
    //         fail(errors);
    //         return;
    //     },
    //     () => { // User not found
    //         Bcrypt.hash(newUser.password, Config.salt.rounds, (errHash, hash) => {
    //             if (errHash) {
    //                 errors.push({ "type": "hash", "errHash": errHash });
    //                 fail(errors);
    //                 return;
    //             }

    //             newUser.password = hash;

    //             // Saving to db
    //             users.insertOne(newUser, (errSave, result) => {
    //                 if (errSave) {
    //                     errors.push({ "type": "save", "errSave": errSave });
    //                     fail(errors);
    //                     return;
    //                 }

    //                 let oid = result.insertedId;

    //                 Winston.debug('Successfully registered new user.', {
    //                     "username": newUser.username,
    //                     "email": newUser.email,
    //                     "oidString": oid.toString()
    //                 });

    //                 success(oid);
    //             });
    //         });
    //     }
    // );
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

exports.edit = function(ctx, success, failure) {
    function fail(error) {
        Winston.debug("Failed to edit configuration.", {
            "username": user.username,
            "cid": (cid || "").toString(),
            "edit": edit,
            "error": error
        });

        failure(error);
    }

    [
        user,
        edit
    ] = [
        ctx.user,
        ctx.edit
    ];

    if (!user) return;
    if (!edit) return;

    // ----

    new Chain(function() {
        if (typeof edit == 'undefined') {
            edit = {};
            this.next();
        } else {
            let editValidity = Schema.validate('/UserEdit', edit);

            if (!editValidity)
                return fail({ "type": "editValidity", "errors": Schema.errors() });

            if (edit.email && (edit.email != user.email)) {
                user.verified = false;
                exports.find(undefined, edit.email,
                    () => { // Email taken
                        fail({ "type": "emailTaken" });
                    },
                    this.next.bind(this) // Email not found
                );
            } else this.next();
        }
    }, function() {
        // Custom array merge function ensures all arrays are concatenated.
        // e.g:
        // >> let test1 = { "test": [ 1, 2, 3 ]}
        // >> let test2 = { "test": [ 4, 5, 6 ]}
        // >> deepmerge(test1, test2, { ... })
        // { "test": [ 1, 2, 3, 4, 5, 6 ] }
                
        let newData = deepmerge(user, edit, {
            arrayMerge: (dest, src) => { return dest.concat(src) }
        });

        let completeValidity = Schema.validate('/User', user);
        
        if (!completeValidity) return fail({
            "type": "completeValidity",
            "errors": Schema.errors()
        });
        
        // -----

        let users = Db.collection('users');

        users.updateOne(
            {'_id': ObjectId(user['_id']) },
            newData,
            this.next.bind(this)
        );

    }, function(errUpdate, writeResult) {
        if (errUpdate || writeResult.result.ok != 1)
            return fail({
                "type": "write",
                "result": (writeResult || "").toString(),
                "error": errUpdate
            });
        
        success();
    });
}
