const hat = require('hat');
const Db = require('./DBHandler');
const Winston = require('winston');

const Auth = require('./Auth');
const Email = require('./Email');
const Config = require('./config.json');
const Utils = require('./Utils');
const Chain = Utils.Chain;

exports.emailRequest = function(user, randomId, callback) {
    Email.sendTemplate(
        {
            "template": "forgot",
            "data": {
                "url": Config.domain + "/forgot/" + randomId,
                "user": user
            },
            "to": user.email,
            "subject": "Password Reset"
        },
        () => callback(true), // success
        () => callback(false) // failure
    );
};

exports.createRequest = function(email, callback) {
    function fail(error) {
        Winston.debug("Failed to create password reset request.", {
            "error": error
        });
        callback(false);
    }

    let randomId = hat();
    let expiration = (new Date()).getTime() + (24 * 60 * 60 * 1000);
    let data = {};

    new Chain(function() {
        Auth.find(
            undefined,
            email, // Find by email only
            this.next.bind(this),
            fail,
            ["_id", "username", "email"]
        );
    }, function(user) {
        data.user = user;

        Db.collection('forgot').insertOne(
            {
                "expiration": expiration,
                "randomId": randomId,
                "uid": user["_id"].toString()
            },
            this.next.bind(this)
        );
    }, function(errSave, result) {
        if (errSave)
            return fail({
                "errorName": "save",
                "errorNameFull": "Forgot.createRequest.save",
                "errorData": {
                    "errSave": errSave
                }
            });

        // Let user go before sending email;
        // it could take a little while to send.
        callback(true);
        
        exports.emailRequest(data.user, randomId, succeeded => {
            if (succeeded) return;

            // Don't call fail since the callback has already been fired
            Winston.warn('Email could not be sent.', {
                "error": {
                    "errorName": "emailSend",
                    "errorNameFull": "Forgot.createRequest.emailSend"
                }
            });
        });
    });
};

exports.removeRequest = function(fid, success, failure) {
    function fail(error) {
        Winston.warn(
            'Error removing expired forgot password request.',
            { "error": error }
        );
        if (failure) failure(error);
    }

    let filter = { "randomId": fid };

    Db.collection('forgot').deleteOne(filter, error => {
        if (error) return fail({
            "errorName": "deleteRequest",
            "errorNameFull": "Forgot.removeRequest.deleteRequest",
            "error": error
        });

        if (success) success();
    });
};

exports.find = function(fid, success, failure) {
    function fail(error) {
        Winston.debug('Error retrieving forgot password request.', {
            "error": error
        });
        if (failure) failure(error);
    }

    let filter = { "randomId": fid };
    let forgotDb = Db.collection('forgot');

    forgotDb.findOne(filter, (error, forgot) => {
        if (forgot == null || error != null) 
            return fail({
                "errorName": "notFound",
                "errorNameFull": "Forgot.find.notFound",
                "error": error
            });

        if (forgot.expiration < (new Date()).getTime()) {
            fail({
                "errorName": "expired",
                "errorNameFull": "Forgot.find.expired",
                "error": error                 
            });
            return exports.removeRequest(fid);
        }

        Winston.debug("Found forgot password request.", {
            "filter": filter
        });
        success(forgot);
    });
}

exports.useRequest = function(fid, password, success, failure) {
    function fail(error) {
        Winston.debug('Error using forgot password request.', {
            "error": error
        });
        failure(error);
    }

    let data = {};

    new Chain(function() {
        exports.find(
            fid,
            this.next.bind(this),
            fail
        );
    }, function(forgot) {
        Auth.editPassword(
            forgot.uid,
            password,
            this.next.bind(this),
            fail
        );
    }, function() {
        // Let the user go at this point; deleting the request can be
        // handled separately
        success();

        exports.removeRequest(
            fid,
            () => { // success
                Winston.debug('Forgot request removed successfully.', {
                    "fid": fid
                });
            },
            error => {
                Winston.warn('Failed to remove forgot password request.', {
                    "errorName": "requestRemove",
                    "errorNameFull": "Forgot.useRequest.requestRemove",
                    "errorData": {
                        "fid": fid,
                        "error": error
                    }
                });
            }
        );
    });

};