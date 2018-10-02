const nodemailer = require('nodemailer');
const mustache = require('mustache');
const fs = require('fs');
const Winston = require('winston');

const Config = require("./config.json");

exports.init = function(transportConf) {
    exports.transporter = nodemailer.createTransport(transportConf);

    exports.templates = {};    
    fs.readdirSync('./emails/').forEach(path => {
        let template = fs.readFileSync("./emails/" + path, "utf8");
        exports.templates[path.split('.')[0]] = template;
    });
};

exports.sendTemplate = function(options, success, failure) {
    let template = exports.templates[options.template];
    let data = options.data;

    let html = mustache.render(template, data);
    options.html = html;

    exports.send(options, success, failure);
};

exports.send = function(options, success, failure) {
    function fail(error) {
        Winston.debug("Failed to send email.", {
            "error": error
        });
        failure(false);
    }

    options.from = Config.email.auth.user;

    if (!Config.email.enabled) return fail({
        "errorName": "disabled",
        "errorNameFull": "Email.send.disabled"
    });
    
    exports.transporter.sendMail(options, (error, data) => {
        if (error) return fail({
            "errorName": "sendMail",
            "errorNameFull": "Email.send.sendMail",
            "errorData": {
                "errorSend": error
            }
        });
        success(data.response);
    });
};