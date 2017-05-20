const schemaUser = require('./schema/user.json');

const validate = require('jsonschema').validate;
const Winston = require('winston');
const bcrypt = require('bcrypt');
const Config = require('./config.json');

function registerError(res, errors) {
    let errorString = JSON.stringify(errors);
    // Removes all [, ], and "
    errorString = errorString.replace(/"|\[|\]/g, '') 
    res.redirect('/register?' + errorString);
}

exports.register = function(req, res, db) {
    let newUser = {
        "username": req.body.username,
        "email": req.body.email,
        "password": req.body.password,
        "description": {},
        "creation": Date.now(),
        "verified": false
    };

    let validity = validate(newUser, schemaUser);
    let errors = [];

    // Schema Validity
    if (validity.errors.length == 0) {
        // Username/email conflict
        let query = {"$or": [
            { "username": newUser.username },
            { "email": newUser.email }
        ]}; 

        db.collection('users').findOne(query, function(errFind, body) {
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
            bcrypt.hash(newUser.password, Config.salt.rounds, function(errSalt, hash) {
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
                db.collection('users').save(newUser, function(errSave, result) {
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
    } else {
        validity.errors.forEach(function(value, i, arr) {
            // Grab the actual property name instead of "instance.<property>"
            errors.push(value.property.split('.')[1]);
        });
        Winston.debug("Error validating new user.", {
            "username": newUser.username,
            "email": newUser.email,
            "errors": errors,
            "validity": validity
        });
        registerError(res, errors);
    }
};

exports.login = function(req, res, db) {
    let [username, password] = [req.body.username, req.body.password];

    db.collection('users').findOne(
        { "username": username },
        function(err, body) {
            if (body == null) { // Invalid username
                res.redirect('/login?invalid');
                return;
            }

            bcrypt.compare(password, body.password, function(err, result) {
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

exports.logout = function(req, res) {
    req.session.reset();
    res.redirect('/login');
};