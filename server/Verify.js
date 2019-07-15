const hat = require('hat');
const Db = require('./DBHandler');
const Bcrypt = require('bcryptjs');
const Winston = require('winston');

const Auth = require('./Auth');
const Email = require('./Email');
const Config = require('./config.json');
const Utils = require('./Utils');
const Chain = Utils.Chain;

/**
 * Emails the verification request.
 * 
 * @param {object} user User entry from database.
 * @param {string} randomId Random ID for verification request.
 * @param {boolCallback} callback
 */
exports.emailRequest = function(user, randomId, callback) {
    Email.sendTemplate(
        {
            "template": "verify",
            "data": {
                "url": Config.domain + "/verify/" + randomId,
                "user": user
            },
            "to": user.email,
            "subject": "Verify Email"
        },
        () => { callback(true) }, // success
        () => { callback(false) } // failure
    );
};

/**
 * Creates a verification request. Calls Verify.emailRequest on success.
 * 
 * @param {object} user User entry from database.
 * @param {boolCallback} callback
 */
exports.createRequest = function(user, callback) {
    function fail(error) {
        Winston.debug("Failed to create verify email request.", {
            "error": error
        });
        callback(false);
    }

    // If user is already verified, then prevent request
    if (user.verified)
        return fail({
            "errorName": "verified",
            "errorNameFull": "Verify.createRequest.verified",
        });

    let randomId = hat();
    let expiration = (new Date()).getTime() + (24 * 60 * 60 * 1000);
    let data = {};

    new Chain(function() {
        Db.collection('verify').insertOne(
            {
                "expiration": expiration,
                "randomId": randomId,
                "uid": user["_id"].toString()
            },
            this.next.bind(this)
        );
    }, function(errSave) {
        if (errSave)
            return fail({
                "errorName": "save",
                "errorNameFull": "Verify.createRequest.save",
            });

        // Let user go before sending email; it could take a little while to send.
        callback(true);
        
        // Everything after this point is asynchronous from the user!!!

        exports.emailRequest(
            user,
            randomId,
            this.next.bind(this)
        );
    }, function(succeeded) {
        if (succeeded) return;

        // Don't call fail since the callback has already been fired
        Winston.warn('Email could not be sent.', {
            "error": {
                "errorName": "emailSend",
                "errorNameFull": "Verify.createRequest.emailSend"
            }
        });
    });
};

/**
 * Removes a verfication request.
 * 
 * @param {string} vid Random ID for verification request.
 * @param {genericSuccess} success
 * @param {genericFailure} failure
 */
exports.removeRequest = function(vid, success, failure) {
    function fail(error) {
        Winston.warn(
            'Error removing expired verify request.',
            { "error": error }
        );
        if (failure) failure(error);
    }

    let filter = { "randomId": vid };

    Db.collection('verify').deleteOne(filter, function(error) {
        if (error) return fail({
            "errorName": "deleteRequest",
            "errorNameFull": "Verify.removeRequest.deleteRequest",
            "error": error
        });

        if (success) success();
    });
};

/**
 * @callback verifyFindSuccess
 * @param {object} verify Verify request in DB. 
 */
/**
 * Finds a verfication request.
 * 
 * @param {string} vid Random ID for verification request.
 * @param {verifyFindSuccess} success
 * @param {genericFailure} failure
 */
exports.find = function(vid, success, failure) {
    function fail(error) {
        Winston.debug('Error retrieving verify email request.', {
            "error": error
        });
        if (failure) failure(error);
    }

    let filter = { "randomId": vid };
    let verifyDb = Db.collection('verify');

    verifyDb.findOne(filter, (error, verify) => {
        if (verify == null || error != null) 
            return fail({
                "errorName": "notFound",
                "errorNameFull": "Verify.find.notFound",
                "error": error                 
            });

        // If the request has expired, automatically delete it.
        // This means that the first error for the request will be "Verify.find.expired",
        // but the second will be "Verify.find.notFound".
        // For debugging purposes, I believe this behavior makes sense, but may be a bit confusing.
        if (verify.expiration < (new Date()).getTime()) {
            fail({
                "errorName": "expired",
                "errorNameFull": "Verify.find.expired",
                "error": error
            });
            return Verify.removeRequest(vid);
        }

        Winston.debug("Found verify email request.", {
            "filter": filter
        });
        success(verify);
    });
};

/**
 * Uses a verfication request.
 * 
 * @param {string} vid Random ID for verification request.
 * @param {genericSuccess} success
 * @param {genericFailure} failure
 */
exports.useRequest = function(vid, success, failure) {
    function fail(error) {
        Winston.debug('Error using verify password request.', {
            "error": error
        });
        failure(error);
    }

    let data = {};

    new Chain(function() {
        exports.find(
            vid,
            this.next.bind(this),
            error => fail(error)
        );
    }, function(verify) {
        Auth.setVerified(
            verify.uid,
            true,
            this.next.bind(this),
            error => fail(error)
        );
    }, function() {
        // Let the user go at this point; deleting the request can be handled separately.
        success();

        exports.removeRequest(
            vid,
            () => { // success
                Winston.debug('Verify request removed successfully.', {
                    "vid": vid
                });
            },
            () => {
                Winston.warn('Failed to remove verify password request.', {
                    "errorName": "requestRemove",
                    "errorNameFull": "Verify.useRequest.requestRemove",
                    "errorData": {
                        "vid": vid
                    }
                });
            }
        );
    });
};