const hat = require('hat');
const Db = require('./db.js');
const Auth = require('./auth.js');
const Winston = require('winston');
const Email = require('./email.js');
const Config = require('./config.json');


exports.emailRequest = function(user, randomId, callback) {
    Email.sendTemplate(
        {
            "template": "forgot",
            "data": {
                "url": Config.domain + "/forgot/" + randomId
            },
            "to": user.email,
            "subject": "Password Reset"
        },
        () => { callback(true) }, // success
        () => { callback(false) } // failure
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

    Auth.find(undefined, email, (user) => {
        Db.collection('forgot').insertOne(
            {
                "expiration": expiration,
                "randomId": randomId,
                "uid": user["_id"].toString()
            },
            () => {
                exports.emailRequest(user, randomId, callback);
            }
        );
    }, fail, ["_id", "email"]);
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

    Db.collection('forgot').deleteOne(filter, function(error) {
        if (error) return fail({
            "errorName": "deleteRequest",
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
                "error": error                 
            });

        if (forgot.expiration < (new Date()).getTime()) {
            fail({
                "errorName": "expired",
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