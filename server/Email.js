const nodemailer = require('nodemailer');
const mustache = require('mustache');
const fs = require('fs');
const Winston = require('winston');

const Config = require("./config.json");

class Email {
    static init(transportConf) {
        Email.transporter = nodemailer.createTransport(transportConf);

        Email.templates = {};    
        fs.readdirSync('./emails/').forEach(path => {
            let template = fs.readFileSync("./emails/" + path, "utf8");
            Email.templates[path.split('.')[0]] = template;
        });
    }
    
    static sendTemplate(options, success, failure) {
        let template = Email.templates[options.template];
        let data = options.data;
    
        let html = mustache.render(template, data);
        options.html = html;
    
        Email.send(options, success, failure);
    };
    
    static send(options, success, failure) {
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
        
        Email.transporter.sendMail(options, (error, data) => {
            if (error) return fail({
                "errorName": "sendMail",
                "errorNameFull": "Email.send.sendMail",
                "errorData": {
                    "errorSend": error
                }
            });
            success(data.response);
        });
    }
}

module.exports = Email;