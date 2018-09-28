const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId; 

const Utils = require('./Utils');
const Auth = require('./Auth');
const Configurations = require('./Configurations');
const Sensor = require('./Sensors.js');
const SensorTypes = require('./SensorTypes.js');
const Reading = require('./Reading');
const Chain = Utils.Chain;
const Forgot = require('./Forgot');
const Verify = require('./Verify.js');
const RoutingCore = require('./RoutingCore.js');
const Config = require('./config.json');

class RoutingActions {
    static init(app) {
        if (Config.debugMode) {
            app.get('/oops', (req, res) => {
                throw "a fit"; 
            });
        }
        
        app.get('/configurations/new', (req, res) => {
            let data = {};
        
            new Chain(function() {
                RoutingCore.stepUser(
                    req, res, data, {},
                    this.next.bind(this)
                );
            }, function() {
                if (data.user)
                    Configurations.new(data.user, this.next.bind(this));
                else
                    res.redirect('/login');
            }, function(cid) {
                res.redirect(`/configurations/${cid}/edit`);
            });
        });
        
        
        app.post('/forgotDo', (req, res) => {
            let email = (req.body.email || '').toLowerCase();
            Forgot.createRequest(email, succeeded => {
                if (succeeded) res.redirect('/login?forgotSent=true');
                else res.redirect('/forgot?invalid=true');
            });
        });
        
        // Login
        // ------------------------------------
        app.post('/loginDo', (req, res) => {
            Auth.login(req.body.username, req.body.password, 
                oid => { // Success
                    req.session.oid = oid.toString();
        
                    if (req.body.infoOnly)
                        res.send({
                            "success": true
                        });
                    else
                        res.redirect('/dashboard.html');
                },
                error => { // Failure
                    if (req.body.infoOnly)
                        res.send({
                            "errorName": "invalid",
                            "errorNameFull": "RoutingActions.login.invalid"
                        });
                    else
                        res.redirect('/login.html?invalid=true');
                }
            );
        });
        
        // Register (action)
        // ------------------------------------
        app.post('/registerdo', (req, res) => {
            Auth.register(req.body,
                oid => { // Success
                    req.session.oid = oid.toString();
        
                    if (typeof req.query.quick != 'undefined')
                        res.redirect('/tutorial/standard');
                    else
                        res.redirect('/tutorial');
                },
                errors => {
                    let errorString = '/register?'; 
                    errors.forEach((error) => {
                        if (error.errorName == 'validity')
                            errorString += (error.errorData.properties
                                .toString()
                                .split(',')
                                .join('=true&')) + '=true&';
                        else
                            errorString += error.errorName + '=true&';
                    });
        
                    errorString = errorString.substr(0, errorString.length - 1);
                    res.redirect(errorString);
                }
            );
        });
        
        // Logout (action)
        // ------------------------------------        
        app.all('/logout', (req, res) => {
            req.session.reset();
            res.redirect('/');
        });
        
        // Configuration edit
        // ------------------------------------
        let configPattern = '([0-9a-f]{24})';
        
        app.post(`/configurations/${configPattern}/editDo`, (req, res) => {
            let cid = req.originalUrl.split('/')[2];
            let data = {};
        
            new Chain(function() {
                RoutingCore.stepUser(
                    req, res, data, {},
                    this.next.bind(this)
                );
            }, function() {
                if (typeof data.user == 'undefined')
                    return res.redirect('/login');
        
                Configurations.edit(
                    {
                        "user": data.user,
                        "cid": cid,
                        "edit": req.body
                    },
                    () => res.redirect(`/configurations/${cid}`),
                    error => res.send(`Error processing request. (${error.errorName})`)
                );
            });
        });
        
        app.post(`/user/editDo`, (req, res) => {
            let data = {};
        
            new Chain(function() {
                RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
            }, function() {
                if (typeof data.user == 'undefined')
                    return res.redirect('/login');
        
                Auth.edit(
                    {
                        "user": data.user,
                        "edit": req.body
                    },
                    () => res.redirect(`/dashboard.html`),
                    error => {
                        let knownErrors = ["emailTaken"];
                        let unknownError = !knownErrors.includes(error.errorName);
                        res.redirect(`/user/edit?${error.errorName}=true,unknownError=${unknownError}`) ;
                    }
                );
            });
        });
        
        app.get(`/user/verifyDo`, (req, res) => {
            let data = {};
        
            new Chain(function () {
                RoutingCore.stepUser(
                    req, res, data, {},
                    this.next.bind(this)
                );
            }, function () {
                if (typeof data.user == 'undefined')
                    return res.redirect('/login');
        
                Verify.createRequest(data.user, succeeded => {
                    if (succeeded) res.redirect('/user/edit?verifySent=true');
                    else res.redirect('/user/edit?verifyError=true');
                });
            });
        });
        
        app.post(`/user/apiKeyDo`, (req, res) => {
            if (req.session && req.session.oid) {
                Auth.genApiKey(
                    req.session.oid,
                    () => res.redirect('/user/apiKey'), // Success
                    () => res.redirect('/user/apiKey?error=true') // Failure
                );
            } else res.redirect('/login');
        });
        
        // Remove Sensor (action)
        // ------------------------------------        
        app.post(`/configurations/${configPattern}/removeSensorDo`, (req, res) => {
            let cid = req.originalUrl.split('/')[2];
            let data = {};
        
            new Chain(function() {
                RoutingCore.stepUser(
                    req, res, data, {},
                    this.next.bind(this)
                );
            }, function() {
                Configurations.edit(
                    {
                        "user": data.user,
                        "cid": cid,
                        "removeSensors": [req.body.sid]
                    },
                    () => res.redirect(`/configurations/${cid}`),
                    error => res.send(`Error processing request. (${error.errorName})`)
                );
            });
        });
        
        // Add Sensor to Configuration (action)
        // ------------------------------------        
        app.post(`/configurations/${configPattern}/addSensorDo`, (req, res) => {
            let cid = req.originalUrl.split('/')[2];
            let sid = req.body.sid;
        
            let data = {};
        
            new Chain(function() {
                RoutingCore.stepUser(
                    req, res, data, {},
                    this.next.bind(this)
                );
            }, function() {
                Configurations.addSensor(data.user, cid, sid,
                    () => res.redirect(`/configurations/${cid}`),
                    error => res.send(`Error processing request. (${error.errorName})`)
                );
            });
        });
        
        // Sensor edit (action)
        // ------------------------------------        
        let sensorPattern = '([0-9a-f]{24})';
        
        app.post(`/sensors/${sensorPattern}/editDo`, (req, res) => {
            let sid = req.originalUrl.split('/')[2];
            let data = {};
        
            new Chain(function() {
                RoutingCore.stepUser(
                    req, res, data, {},
                    this.next.bind(this)
                );
            }, function() {
                Sensor.edit(data.user, sid, req.body,
                    () => {
                        let url = `/sensors/${sid}`;
                        if (typeof req.query.configuration != 'undefined')
                            url = `/configurations/${req.query.configuration}`
                        res.redirect(url);
                    },
                    error => res.send(`Error processing request. (${error.errorName})`)
                );
            });
        });
        
        // New Sensor (action)
        // ------------------------------------        
        app.post('/sensors/newDo', (req, res) => {
            let data = {};
        
            new Chain(function() {
                RoutingCore.stepUser(
                    req, res, data, {},
                    this.next.bind(this)
                );
            }, function() {
                Sensor.new(data.user, req.body, req.body.configuration,
                    sid => {
                        let url = `/sensors/${sid}/edit`
                        if (req.query.configuration)
                            url += `?configuration=${req.query.configuration}`
                        res.redirect(url);
                    },
                    error => res.send("Error creating new sensor.")
                );
            });
        });
        
        // Reset Password (action)
        // ------------------------------------
        let forgotPattern = '([0-9a-f]{32})';
        
        app.post(`/forgot/${forgotPattern}/resetDo`, (req, res) => {
            let fid = req.originalUrl.split('/')[2];    
        
            function fail(error) {
                let errorString = `/forgot/${fid}?`;
        
                if (error.errorName == 'validity')
                    errorString += (error.errorData.properties
                        .toString()
                        .split(',')
                        .join('=true&')) + '=true&';
                else
                    errorString += error.errorName + '=true&';
        
                errorString = errorString.substr(0, errorString.length - 1);
        
                Winston.debug('Failed to edit password.', {
                    "error": error,
                    "errorString": errorString
                });
                           
                res.redirect(errorString);
            }
        
            let [password, passwordRetype] =
                [req.body.password, req.body.passwordRetype];
        
            if (password != passwordRetype)
                return fail({
                    "errorName": "passwordMismatch",
                    "errorNameFull": "RoutingActions.forgot.resetDo.passwordMismatch"
                });
                
            Forgot.useRequest(
                fid,
                password,
                () => res.redirect("/login?reset=true"), // Success
                fail // Failure
            );
        });
        
        // Verify user (action)
        // ------------------------------------
        let verifyPattern = '([0-9a-f]{32})';
        
        app.get(`/verify/${verifyPattern}`, (req, res) => {
            let vid = req.originalUrl.split('/')[2];    
        
            function fail(error) {
                Winston.debug('Failed to verify user.', {
                    "error": error
                });
                           
                res.redirect("/dashboard.html?verifyFailure=true");
            }
                
            Verify.useRequest(
                vid,
                () => res.redirect("/dashboard.html?verifySuccess=true"),
                fail
            );
        });
        
        // Submit a Reading (Action)
        // ------------------------------------        
        app.post(`/configurations/${configPattern}/readingDo`, (req, res) => {
            function fail(error) {
                Winston.debug('Error creating new reading', {
                    "error": error
                });
                res.send(error, 400);
            }
        
            let data = { "reading": req.body };
        
            new Chain(function() {
                RoutingCore.stepUser(
                    req, res, data, {},
                    this.next.bind(this)
                );
            }, function() {
                if (typeof data.user == 'undefined')
                    return fail({
                        "errorName": "noUser",
                        "errorNameFull": "RoutingActions.readingDo.noUser"
                    });
                RoutingCore.stepConfiguration(
                    req, res, data, {},
                    this.next.bind(this)
                );
            }, function() {
                if (typeof data.configuration == 'undefined')
                    return fail({
                        "errorName": "noConfiguration",
                        "errorNameFull": "RoutingActions.readingDo.noConfiguration"
                    });
        
                Reading.new(data, this.next.bind(this), fail);
            }, function(rid) {
                if (req.body.infoOnly)
                    res.send({
                        "success": true,
                        "rid": rid
                    });
                else
                    res.redirect(`/readings/${rid}`);
            });
        });
    }
}

module.exports = RoutingActions;