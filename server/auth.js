// ============================================================================
// IMPORTS
// ============================================================================

const ObjectId = require('mongodb').ObjectId;
const Winston = require('winston');
const Bcrypt = require('bcryptjs');
const deepmerge = require('deepmerge');
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

/**
 * Success callback for Auth.find and similar functions.
 * @callback authFindSuccess
 * @param {object} user See JSON schema /User.
 */
/**
 * Finds a user by username and/or email.
 *
 * @param {string} username Undefined if wanting to search by email.
 * @param {string} email Undefined if wanting to search by username.
 * @param {authFindSuccess} success Callback to be run upon successful find.
 * @param {genericFailure} failure Callback to be run if no user is found.
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

/**
 * Finds a user by object ID.
 *
 * @param {(ObjectId|string)} uid Undefined if wanting to search by username.
 * @param {authFindSuccess} success Callback to be run upon successful find.
 * @param {genericFailure} failure Callback to be run if no user is found.
 * @param {string[]} reqs Array of field names needed by query.
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

/**
 * Finds a user by query.
 *
 * @param {object} query MongoDB query object. See JSON schema /Query.
 * @param {authFindSuccess} success Callback to be run upon successful find.
 * @param {genericFailure} failure Callback to be run if no user is found.
 */
exports.findQuery = function(query, success, failure) {
    function fail(error) {
        Winston.debug('Could not process query.', {
            "error": error
        });
        failure(error);
    }

    let queryValidity = Schema.validate('/Query', query);
    
    if (!queryValidity)
        return fail({
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
            if (user == null || error != null)
                return fail({
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

/**
 * Success callback for Auth.register.
 * 
 * @callback authRegisterSuccess
 * @param {ObjectId} oid ObjectId of the new user.
 */
/**
 * Failure callback for Auth.register.
 * 
 * @callback authRegisterFailure
 * @param {error[]} error Array of error objects.
 */
/**
 * Registers a user.
 * 
 * @param {object} data Data used to create new user. See JSON schema for /User.
 * @param {authRegisterSuccess} success Callback which is run on a successful registration.
 * @param {authRegisterFailure} failure Callback which is run on an unsuccessful registration.
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

    }, function(errorHash, hash) { // Password encryption done -> Store user in DB

        if (errorHash) {
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
        users.insertOne(newUser, this.next.bind(this));

    }, function(errSave, result) { // User saved -> Success

        if (errSave) {
            errors.push({
                "errorName": "save",
                "errorNameFull": "Auth.register.save",
            });
            return fail(errors);
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

/**
 * Success callback for Auth.login.
 * @callback authLoginSuccess
 * @param {ObjectId} oid
 */
/**
 * Validates a correct username and password combination.
 * Does not affect session.
 * 
 * @param {string} username Username of user.
 * @param {string} password Password of user. (Not hash)
 * @param {authLoginSuccess} success Callback to be run upon successful validation.
 * @param {genericFailure} failure Callback to be run in case of error.
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

/**
 * Context object for Auth.edit.
 * @typedef {object} authEditCtx
 * @property {object} user User object. (/User JSON schema.)
 * @property {object} edit Edit object. (/UserEdit JSON schema.)
 */
/**
 * Validates a correct username and password combination.
 * Does not affect session.
 * 
 * @param {authEditCtx} ctx Context object.
 * @param {function} success Callback to be run upon successful edit. (No parameters.)
 * @param {genericFailure} failure Callback to be run in case of error.
 */
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
        
        if (!completeValidity)
            return fail({
                "errorName": "completeValidity",
                "errorNameFull": "Auth.edit.completeValidity",
                "errorData": {
                    "schemaErrors": Schema.errors()
                }
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

/**
 * Edits password for user.
 * 
 * @param {(ObjectId|string)} uid User ID.
 * @param {string} password New password for user.
 * @param {function} success Success callback. (No parameters.)
 * @param {genericFailure} failure
 */
exports.editPassword = function(uid, password, success, failure) {
    function fail(error) {
        Winston.debug("Failed to edit password.", {
            "error": error
        });

        failure(error);
    }

    uid = Utils.testOid(uid, fail);
    if (!uid) return;

    let passwordValidity = Schema.validate('/UserPasswordEdit', {
        "password": password
    });

    if (!passwordValidity) {
        let validityErrors = Schema.errors() || [];
        let properties = [];
        validityErrors.forEach(function(value) {
            // Grab the actual property name instead of ".<property>"
            properties.push(value.dataPath.split('.')[1]);
        });

        return fail({
            "errorName": "validity",
            "errorNameFull": "Auth.editPassword.validity",
            "errorData": {
                "validityErrors": validityErrors,
                "properties": properties
            }
        });
    }

    new Chain(function() {
        Bcrypt.hash(
            password,
            Config.salt.rounds,
            this.next.bind(this)
        );
    }, function(errorHash, hash) {
        if (errorHash)
            return fail({
                "errorName": "hash",
                "errorNameFull": "Forgot.useRequest.hash",
                "errorData": {
                    "errorHash": errorHash
                } 
            });

        // $set MUST BE USED OR ELSE ALL OTHER PROPERTIES OF DOCUMENT ARE ERASED

        let edit = { 
            "$set": {
                "password": hash
            }
        };
        let users = Db.collection('users');

        users.update(
            {'_id': uid },
            edit,
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

/**
 * Success callback for Auth.login.
 * @callback authGenApiKeySuccess
 * @param {string} apiKey
 */
/**
 * Generates new API key for user.
 * 
 * @param {(ObjectId|string)} uid User ID.
 * @param {authGenApiKeySuccess} success Success callback.
 * @param {genericFailure} failure
 */
exports.genApiKey = function(uid, success, failure) {
    function fail(error) {
        Winston.debug("Failed to generate API key.", {
            "error": error
        });

        failure(error);
    }

    uid = Utils.testOid(uid, fail);
    if (!uid) return;

    let users = Db.collection('users');
    
    users.update(
        {'_id': uid },
        { 
            "$set": {
                "apiKey": hat()
            }
        },
        function(errUpdate, writeResult) {
            if (errUpdate || writeResult.result.ok != 1)
                return fail({
                    "errorName": "write",
                    "errorNameFull": "Auth.genApiKey.write",
                    "errorData": {
                        "result": (writeResult || "").toString(),
                        "errorUpdate": errUpdate
                    }
                });
            
            success();
        }
    );
}

/**
 * Sets a user as verified or not.
 * 
 * @param {(ObjectId|string)} uid User ID.
 * @param {boolean} verified New verified status for user.
 * @param {function} success Success callback. (No parameters.)
 * @param {genericFailure} failure
 */
exports.setVerified = function (uid, verified, success, failure) {
    function fail(error) {
        Winston.debug("Failed to set user as verified or not.", {
            "error": error
        });

        failure(error);
    }

    uid = Utils.testOid(uid, fail);
    if (!uid) return;

    let users = Db.collection('users');

    users.update(
        { '_id': uid },
        {
            "$set": {
                "verified": verified
            }
        },
        function (errUpdate, writeResult) {
            if (errUpdate || writeResult.result.ok != 1)
                return fail({
                    "errorName": "write",
                    "errorNameFull": "Auth.setVerified.write",
                    "errorData": {
                        "result": (writeResult || "").toString(),
                        "errorUpdate": errUpdate
                    }
                });

            success();
        }
    );
}