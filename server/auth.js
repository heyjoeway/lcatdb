// ============================================================================
// IMPORTS
// ============================================================================

const ObjectId = require('mongodb').ObjectId;
const Winston = require('winston');
const Bcrypt = require('bcrypt');
const deepmerge = require('deepmerge');

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

    if (username) query["$or"].push({ "username": username.toLowerCase() });
    if (email) query["$or"].push({ "email": email.toLowerCase() });

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

exports.findOid = function(uid, success, failure, reqs) {
    function fail(error) {
        Winston.debug('Could not find user by id.', {
            "error": error,
            "oid": oid
        });
        failure(error);
    }

    uid = Utils.testOid(uid, fail);
    if (!uid) return;

    return exports.findQuery({
       "filter": { "_id": uid },
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
        "errorNameFull": "Auth.findQuery.queryValidity",
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
                "errorNameFull": "Auth.findQuery.notFound",
                "errorData": {
                    "errorFind": error
                }
            });
            
            Winston.debug("Found user.", {
                "fields": fields,
                "filter": filter
            });
            success(user);
        });
    } catch(e) {
        fail({
            "errorName": "exception",
            "errorNameFull": "Auth.findQuery.exception"
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

    // Email and username are converted to lowercase in order to prevent
    // conflicts when searching. For example:
    //
    //   fooBar
    //   Foobar
    //   FooBar
    //
    // Despite being spelled the same, these would actually all be considered
    // 3 separate usernames.
    //
    // Don't bother validating this client side; that would only make another
    // use case to test.

    if (data.email) data.email = data.email.toLowerCase();
    if (data.username) data.username = data.username.toLowerCase();

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

    // Have an array of errors so that the user doesn't have to play "request
    // tag" to figure out what input is valid.

    let errors = [];

    // ---- JSON SCHEMA VALIDITY

    let validity = Schema.validate('/User', newUser);

    let passwordMismatch = data.password != data.passwordRetype;
    if (passwordMismatch) errors.push({
        "errorName": "passwordMismatch",
        "errorNameFull": "Auth.register.passwordMismatch",
    });

    // Schema Validity/Password Mismatch
    if (!validity || passwordMismatch) {
        let validityErrors = Schema.errors() || [];
        let properties = [];
        validityErrors.forEach(function(value) {
            // Grab the actual property name instead of ".<property>"
            properties.push(value.dataPath.split('.')[1]);
        });

        errors.push({
            "errorName": "validity",
            "errorNameFull": "Auth.register.validity",
            "errorData": {
                "validityErrors": validityErrors,
                "properties": properties
            },
        });

        return fail(errors);
    }

    // ---- USERNAME/EMAIL COLLISION

    new Chain(function() { // Try to find preexisting user

        exports.find(newUser.username, newUser.email,
            () => { // User found
                errors.push({
                    "errorName": "taken",
                    "errorNameFull": "Auth.register.taken"
                });
                fail(errors);
            },
            this.next.bind(this)
        );

    }, function() { // User not found -> Encrypt password
        
        Bcrypt.hash(
            newUser.password,
            Config.salt.rounds,
            this.next.bind(this)
        );

    }, function(errHash, hash) { // Password encryption done -> Store user in DB

        if (errHash) {
            errors.push({
                "errorName": "hash",
                "errorNameFull": "Auth.register.hash",
                "errorData": {
                    "errorHash": errorHash
                } 
            });
            return fail(errors);
        }

        newUser.password = hash;
        users.insertOne(newUser,  this.next.bind(this));

    }, function(errSave, result) { // User saved -> Success

        if (errSave) {
            errors.push({
                "errorName": "save",
                "errorNameFull": "Auth.register.save",
            });
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
        failure(error);
    }

    exports.find(username, undefined, // Leave email undefined
        (user) => { // User found
            Bcrypt.compare(password, user.password, function(err, result) {
                if (result) { // Pasword valid
                    let uid = ObjectId(user["_id"]);
                    return success(uid);
                }

                // Password invalid
                fail({
                    "errorName": "password",
                    "errorNameFull": "Auth.login.password"
                }); 
            });
        },
        (errorFind) => { // User not found
            fail({
                "errorName": "username",
                "errorNameFull": "Auth.login.username",
                "errorData": {
                    "errorFind": errorFind
                }
            });
        }
    );
};

exports.edit = function(ctx, success, failure) {
    function fail(error) {
        Winston.debug("Failed to edit user.", {
            "ctx": ctx,
            "error": error
        });

        failure(error);
    }

    [user, edit] = [ctx.user, ctx.edit];

    if (!user) 
        return fail({
            "errorName": "noUser",
            "errorNameFull": "Auth.edit.noUser"
        });

    if (!edit) 
        return fail({
            "errorName": "noEdit",
            "errorNameFull": "Auth.edit.noEdit"
        });

    // ----

    new Chain(function() {

        // Skip if edit is blank
        if (typeof edit == 'undefined') {
            edit = {};
            return this.next();
        }
    
        // Convert username and email to lowercase
        // (Check Auth.register for explanation)

        if (edit.email) edit.email = edit.email.toLowerCase();
        else edit.email = undefined;

        if (edit.username) edit.username = edit.username.toLowerCase();            

        let editValidity = Schema.validate('/UserEdit', edit);
        
        if (!editValidity)
            return fail({
                "errorName": "editValidity",
                "errorNameFull": "Auth.edit.editValidity",
                "errorData": {
                    "schemaErrors": Schema.errors()
                }
            });

        this.pause();

        // TODO: Revise this to only use one request.

        if (edit.email && (edit.email != user.email)) {
            user.verified = false;
            exports.find(undefined, edit.email,
                () => { // Email taken
                    fail({
                        "errorName": "emailTaken",
                        "errorNameFull": "Auth.edit.emailTaken"
                    });
                },
                this.next.bind(this)
            );
        } else this.next();

        if (edit.username && (edit.username != user.username)) {
            exports.find(edit.username, undefined,
                () => { // Username taken
                    fail({
                        "errorName": "usernameTaken",
                        "errorNameFull": "Auth.edit.usernameTaken"
                    });
                },
                this.next.bind(this) // Username not found
            );
        } else this.next();

    }, function() { // Merge, re-check, and save data
        // Custom array merge function ensures all arrays are concatenated.
        // e.g:
        // >> let test1 = { "test": [ 1, 2, 3 ]}
        // >> let test2 = { "test": [ 4, 5, 6 ]}
        // >> deepmerge(test1, test2, { ... })
        // { "test": [ 1, 2, 3, 4, 5, 6 ] }
                
        let newData = deepmerge(user, edit, {
            arrayMerge: (dest, src) => { return dest.concat(src) }
        });

        let completeValidity = Schema.validate('/User', newData);
        
        if (!completeValidity) {
            let schemaErrors = Schema.errors();
            return fail({
                "errorName": "completeValidity",
                "errorNameFull": "Auth.edit.completeValidity",
                "errorData": {
                    "schemaErrors": schemaErrors
                }
            });
        } 
        
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
                "errorName": "write",
                "errorNameFull": "Auth.edit.write",
                "errorData": {
                    "result": (writeResult || "").toString(),
                    "errorUpdate": errUpdate
                }
            });
        
        success();
    });
}

exports.editPassword = function(ctx, success, failure) {
    function fail(error) {
        Winston.debug("Failed to edit password.", {
            "error": error
        });

        failure(error);
    }
}