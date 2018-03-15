const nodemailer = require('nodemailer');
const mustache = require('mustache');
const fs = require('fs');
const Winston = require('winston');
const Config = require("./config.json");

let transporter, templates;

exports.init = function(transportConf) {
    transporter = nodemailer.createTransport(transportConf);

    templates = {};

    fs.readdirSync('./emails/').forEach((path) => {
        let template = fs.readFileSync("./emails/" + path, "utf8");
        templates[path.split('.')[0]] = template;
    });
}

exports.sendTemplate = function(config, success, failure) {
    let template = templates[config.template];
    let data = config.data;

    let html = mustache.render(template, data);
    config.html = html;

    exports.send(config, success, failure);
};

exports.send = function(config, success, failure) {
    function fail(error) {
        Winston.debug("Failed to send email.", {
            "error": error
        });
        failure(false);
    }

    if (!Config.email.enabled) return fail({
        "errorName": "disabled",
        "errorNameFull": "Email.send.disabled"
    });
    
    transporter.sendMail(config, (error, data) => {
        if (error)
            return fail({
                "errorName": "sendMail",
                "errorNameFull": "Email.send.sendMail",
                "errorData": {
                    "errorSend": error
                }
            });
        success(data.response);
    });
}