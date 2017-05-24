const Schema = require('./schema.js');
const Config = require('./config.json');

const Winston = require('winston');
const Bcrypt = require('bcrypt');

// ============================================================================
// REGISTRATION
// ============================================================================

function registerError(res, errors) {
    let errorString = JSON.stringify(errors);
    // Removes all [, ], and "
    errorString = errorString.replace(/"|\[|\]/g, '').replace(/,/g, '&');
    res.redirect('/register?' + errorString);
}

/*
 * Registers a user.
 * req: express request object.
 * res: express response object.
 * users: mongoDB collection object.
 */

exports.register = function(req, res, users) {
    let newUser = Schema.defaultsKey("user");
    let errors = [];

    [
        newUser.username,
        newUser.email,
        newUser.password,
        newUser.timezone,
        newUser.creation
    ] = [
        req.body.username,
        req.body.email,
        req.body.password,
        parseFloat(req.body.timezone),
        Date.now()
    ];

    let validity = Schema.validateKey(newUser, "user");

    let passwordMismatch = req.body.password != req.body.passwordRetype;
    if (passwordMismatch) errors.push("passwordMismatch");

    // Schema Validity/Password Mismatch
    if ((validity.errors.length == 0) && !passwordMismatch) {
        // Username/email conflict
        let query = {"$or": [
            { "username": newUser.username },
            { "email": newUser.email }
        ]}; 

        users.findOne(query, function(errFind, body) {
            if (body != null) {
                errors.push('taken');
                Winston.debug("Username or email already exists.", {
                    "username": newUser.username,
                    "email": newUser.email,
                    "errors": errors,
                    "body": body,
                    "errorInternal": errFind
                });
                registerError(res, errors);
                return;
            }

            // Password hashing
            Bcrypt.hash(newUser.password, Config.salt.rounds, function(errSalt, hash) {
                if (errSalt) {
                    errors.push('unknown');
                    Winston.error("Error hashing password.", {
                        "username": newUser.username,
                        "email": newUser.email,
                        "errors": errors,
                        "errorInternal": errSave
                    });
                    registerError(res, errors);
                    console.log(errSalt);
                    return;
                }

                newUser.password = hash;

                // Saving to db
                users.save(newUser, function(errSave, result) {
                    if (errSave) {
                        errors.push('unknown');
                        Winston.error("Error saving new user to database.", {
                            "username": newUser.username,
                            "email": newUser.email,
                            "errors": errors,
                            "errorInternal": errSave
                        });
                        registerError(res, errors);
                        return;
                    }
                    Winston.debug('Successfully registered new user.', {
                        "username": newUser.username,
                        "email": newUser.email
                    });
                    // Automatically login new user and send them to their homepage.
                    req.session.username = newUser.username;
                    res.redirect('/dashboard');
                });
            });
        });
    } else { // If input is not valid
        validity.errors.forEach(function(value, i, arr) {
            // Grab the actual property name instead of "instance.<property>"
            errors.push(value.property.split('.')[1]);
        });
        Winston.debug("Error validating new user.", {
            "username": newUser.username,
            "email": newUser.email,
            "errors": errors,
            "passwordRetype": req.body.passwordRetype,
            "passwordMismatch": passwordMismatch,
            "validity": validity
        });
        registerError(res, errors);
    }
};

// ============================================================================
// LOGIN
// ============================================================================

/*
 * Logs-in a user.
 * req: express request object.
 * res: express response object.
 * users: mongoDB collection object.
 */

exports.login = function(req, res, users) {
    let [username, password] = [req.body.username, req.body.password];

    users.findOne(
        { "username": username },
        function(err, body) {
            // Invalid username
            if (body == null) { 
                res.redirect('/login?invalid');
                return;
            }

            // Compare password to hash (async)
            Bcrypt.compare(password, body.password, function(err, result) {
                if (result) {
                    req.session.username = username;
                    res.redirect('/dashboard');
                } else {
                    res.redirect('/login?invalid');
                }
            });
        }
    );
};

// ============================================================================
// LOGOUT
// ============================================================================

/*
 * Logs-out a user.
 * req: express request object.
 * res: express response object.
 */

exports.logout = function(req, res) {
    req.session.reset();
    res.redirect('/');
};