/*
 * Alright, let's just get some conventions out of the way, both for myself and
 * for anyone working with this in the future:
 * 
 * - UseCamelCase. No_snake_case.
 * - Prefer using ' for quotations. Only use " in objects.
 * - All relative paths should begin with './'. Even in dialogue.
 * - All filesystem paths should end with '/', if they point to a directory.
 * - Do not do ANYTHING synchronously. Do everything async.
 *   - In terms of I/O, anyway.
 *   - Except for the initial config loading.
 * - Always use Winston for logging. Only use console.log for >>very<<
 *   temporary debugging.
 * - Write all JS objects in valid JSON format. Use quotes (") around keys.
*/

const STATIC = __dirname + '/public/';

// ============================================================================
// CONFIG
// ============================================================================

const fs = require('fs');

var configTmp;

try {
    configTmp = require('./config.json');
} catch (e) {
    if (e.code == 'MODULE_NOT_FOUND') {
        console.log('Did not find config file. Copying from "./config.example.json".')
        configTmp = require('./config.example.json');
        fs.writeFileSync('./config.json', JSON.stringify(configTmp, null, '\t'));
    } else {
        throw e;
    }
};

const Config = JSON.parse(JSON.stringify(configTmp));
delete configTmp;

// ============================================================================
// IMPORTS
// ============================================================================

const Winston = require('winston');
Winston.level = Config.log.level;

const MongoClient = require('mongodb').MongoClient;
// Used for getting internal MongoDB post ids
const ObjectId = require('mongodb').ObjectId; 

const Express = require('express');
const app = Express();
const bodyParser = require('body-parser');

const Session = require('client-sessions');

const mustache = require('mustache-express');

// ----------------------------------------------------------------------------
// Champy-DB specific modules
// ----------------------------------------------------------------------------

const Schema = require('./schema.js');
const Auth = require('./auth.js');
const Configurations = require('./configurations.js');
const Db = require('./db.js');
const Sensor = require('./sensor.js');
const SensorTypes = require('./sensorTypes.js');
const Reading = require('./reading.js');

// ============================================================================
// SCHEMA INIT
// ============================================================================

Schema.init();
SensorTypes.init();

// ============================================================================
// MONGO/EXPRESS INIT
// ============================================================================

Db.connect(
    () => { // Success
        app.listen(Config.port, () => {
            Winston.info('Server listening.', { "port" : Config.port });
        });
    },
    (error) => { }
);

// ============================================================================
// EXPRESS INIT
// ============================================================================

app.use(Session({
    cookieName: 'session',
    secret: Config.session.secret,
    duration: Config.session.duration,
    activeDuration: Config.session.ac
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

// ----------------------------------------------------------------------------
// Mustache init
// ----------------------------------------------------------------------------

app.engine('mustache', mustache());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views/');

// ============================================================================
// ROUTING
// ============================================================================

// ----------------------------------------------------------------------------
// Homepage (page)
// ----------------------------------------------------------------------------

// If user is logged in, show them their dashboard.
// Otherwise, just show the homepage.
app.get('/', (req, res) => {
    if (req.session && req.session.username) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(STATIC + 'home.html');
    }
});

// ----------------------------------------------------------------------------
// Login (page)
// ----------------------------------------------------------------------------

app.get('/login', (req, res) => {
    let data = {
        "invalid": typeof(req.query.invalid) != typeof(undefined)
    };

    res.render('login', data);

    Winston.debug("Login page accessed.", {
        "data": data
    });
});

// ----------------------------------------------------------------------------
// Login (action)
// ----------------------------------------------------------------------------

app.post('/logindo', (req, res) => {
    Auth.login(req.body.username, req.body.password, 
        (oid) => { // Success
            req.session.oid = oid.toString();
            res.redirect('/dashboard');
        },
        (error) => { // Failure
            res.redirect('/login?invalid');
        }
    );
});

// ----------------------------------------------------------------------------
// Register (page)
// ----------------------------------------------------------------------------

app.get('/register', (req, res) => {
    req.session.reset();

    let data = { "anyErrors": false };

    for (var key in req.query) {
        data[key] = true;
        data.anyErrors = true;
    }

    Winston.debug("Registration page accessed.", { "data": data });

    res.render('register', data);
});

// ----------------------------------------------------------------------------
// Register (action)
// ----------------------------------------------------------------------------

app.post('/registerdo', (req, res) => {
    Auth.register(req.body,
        (oid) => { // Success
            req.session.oid = oid.toString();
            res.redirect('/dashboard');
        },
        (errors) => {
            let errorString = '/register?'; 
            errors.forEach((error) => {
                if (error.type == 'validity')
                    errorString += error.properties.toString()
                        .replace(/,/g, '&') + '&';
                else
                    errorString += error.type + '&';
            });

            errorString = errorString.substr(0, errorString.length - 1);
            res.redirect(errorString);
        }
    );
});

// ----------------------------------------------------------------------------
// Logout (action)
// ----------------------------------------------------------------------------

app.all('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/');
});

// ----------------------------------------------------------------------------
// Dashboard (page)
// ----------------------------------------------------------------------------

sessionGet('/dashboard', (req, res, user) => {
    res.render('dashboard', user);
});

// ----------------------------------------------------------------------------
// Configurations (page)
// ----------------------------------------------------------------------------

sessionGet('/configurations', (req, res, user) => {
    Configurations.getList(user, (docs) => {
        res.render('configurationList', {
            "configurations": docs
        });
    })
});

// ----------------------------------------------------------------------------
// Configuration (pages)
// ----------------------------------------------------------------------------

/* Regex explanation:
 * ^: Start of string.
 * \/: '/', preceeded by the escape character ('\').
 * configurations: Plain text.
 * \/: Same as before.
 * ([a-f]|[0-9]): Lowercase characters 'a' through 'f' and numbers 0 - 9.
 * {24}: Match the above requirements 24 times.
 * 
 * This will match any mongoDB generated object ID.
 */

let configPattern = '([0-9a-f]{24})';

configurationRender(`/configurations/${configPattern}`, 'configuration', true);
configurationRender(`/configurations/${configPattern}/edit`, 'configurationEdit');
configurationRender(`/configurations/${configPattern}/addSensor`, 'addSensor');

// ----------------------------------------------------------------------------
// Configuration edit (action)
// ----------------------------------------------------------------------------

sessionPost(`/configurations/${configPattern}/editDo`, (req, res, user) => {
    let id = req.originalUrl.split('/')[2];

    Configurations.edit(user, id, req.body,
        () => { res.redirect(`/configurations/${id}`); },
        (error) => { res.send(`Error processing request. (${error.type})`); }
    );
});

// ----------------------------------------------------------------------------
// Add Sensor to Configuration (action)
// ----------------------------------------------------------------------------

sessionPost(`/configurations/${configPattern}/addSensorDo`, (req, res, user) => {
    function fail(error) {
        res.send(`Error processing request. (${error.type})`);
    }

    let cid = req.originalUrl.split('/')[2];

    let sid;
    try { sid = ObjectId(req.body.sid); }
    catch(e) { return fail({ "type": "badId", "exception": "e" }); }

    Configurations.edit(user, cid, { "sensors": [ sid ] },
        () => { res.redirect(`/configurations/${cid}`); },
        fail
    );
});

// ----------------------------------------------------------------------------
// Take a Reading (Page)
// ----------------------------------------------------------------------------

configurationGet(`/configurations/${configPattern}/reading`, (req, res, user, configuration) => {
    Configurations.getSensorList(configuration, 
        (sensors) => {
            let canEdit = Configurations.canEdit(user, configuration);

            sensors.forEach((sensor) => {
                sensor.html = SensorTypes.getInputTemplate(
                    sensor.type, user, configuration, sensor
                );
            });

            Winston.debug('Rendering configuration reading page.', {
                "user": user,
                "configuration": configuration,
                "canEdit": canEdit,
                "sensors": sensors
            });

            res.render('configurationReading', {
                "user": user,
                "configuration": configuration,
                "canEdit": canEdit,
                "sensors": sensors,
                "timeCurrent": Date.now()
            });
        }, 
        (error) => {
            Winston.debug("Failed to render configuration reading page.", {
                "error": error
            })
        }
    );
});

// ----------------------------------------------------------------------------
// Take a Reading (Page)
// ----------------------------------------------------------------------------

configurationPost(`/configurations/${configPattern}/readingDo`, (req, res, user, configuration) => {
    function fail(error) {
        Winston.debug('Error creating new reading', {
            "error": error
        });
        res.send(`Error creating new reading. (${error.type})`);
    }

    function success(rid) {
        res.redirect(`/readings/${rid}`);
    }

    // ----

    // Reorganize Sensor data

    function setPath(obj, path, val) {
        let pathArray = path.split('.');
        let lastCrumb = pathArray.pop();
        pathArray.forEach((crumb) => {
            if (typeof obj[crumb] == 'undefined')
                obj[crumb] = {};
            obj = obj[crumb];
        });
        obj[lastCrumb] = val;
    }

    let rawData = req.body;
    let newData = {};

    Object.keys(rawData).forEach((key) => {
        setPath(newData, key, rawData[key]);
    });


    let oldValues = newData.values;
    newData.values = [];

    let valueKeys = Object.keys(oldValues);
    let valuesLeft = valueKeys.length; 
    let hasFailed = false;

    valueKeys.forEach((key) => {
        let sid = ObjectId(key);
        Sensor.find(sid,
            (sensor) => {
                if (hasFailed) return;
                newData.values.push({
                    "sensor": sid,
                    "type": sensor.type,
                    "data": oldValues[key]
                });

                if (--valuesLeft == 0)
                    Reading.new(
                        user,
                        configuration,
                        newData,
                        success,
                        fail
                    );
            },
            (error) => {
                if (hasFailed) return;
                fail({ "type": "sensorFind", "error": error });
                hasFailed = true;
            }
        );
    });

    // ----

});

// ----------------------------------------------------------------------------
// Reading (Page)
// ----------------------------------------------------------------------------

/* Regex is the same as for Configurations. */

let readingPattern = '([0-9a-f]{24})';

readingRender(`/readings/${readingPattern}`, 'reading');

// ----------------------------------------------------------------------------
// New configuration (action)
// ----------------------------------------------------------------------------

sessionGet('/configurations/new', (req, res, user) => {
    Configurations.new(user, (id) => {
        res.redirect(`/configurations/${id}/edit`);
    });
});

// ----------------------------------------------------------------------------
// Sensors (pages)
// ----------------------------------------------------------------------------

/* Regex is the same as for Configurations. */

let sensorPattern = '([0-9a-f]{24})';

sensorRender(`/sensors/${sensorPattern}`, 'sensor');
sensorRender(`/sensors/${sensorPattern}/edit`, 'sensorEdit', true);

sessionGet('/sensors/new', (req, res, user) => {
    let types = SensorTypes.getTypesMustache();

    res.render('sensorNew', {
        "user": user,
        "types": types,
        "typeFirst": types[0].key,
        "configuration": req.query.configuration
    });
});
// sensorRender(`/sensors/${sensorPattern}/new`, 'addSensor');

// ----------------------------------------------------------------------------
// Sensor edit (action)
// ----------------------------------------------------------------------------

sessionPost(`/sensors/${sensorPattern}/editDo`, (req, res, user) => {
    let id = req.originalUrl.split('/')[2];

    Sensor.edit(user, id, req.body,
        () => {
            let url = `/sensors/${id}`;
            if (req.query.configuration)
                url = `/configurations/${req.query.configuration}`
            res.redirect(url);
        },
        (error) => { res.send(`Error processing request. (${error.type})`); }
    );
});

// ----------------------------------------------------------------------------
// New Sensor (action)
// ----------------------------------------------------------------------------

sessionPost('/sensors/newDo', (req, res, user) => {
    Sensor.new(user, req.body, req.body.configuration,
        (id) => {
            let url = `/sensors/${id}/edit`
            if (req.query.configuration)
                url += `?configuration=${req.query.configuration}`
            res.redirect(url);
        },
        (error) => {
            res.send("Error creating new sensor."); // TODO
        }
    );
});

// ============================================================================
// READINGS
// ============================================================================

/* Renders a Mustache template with user/reading information when the
 * URL is matched. A layer for app.get.
 * 
 * url: Express routing URL or regex.
 * template: Mustache template to be rendered in the case of the URL matching.
 * Information will be passed for rendering with the following properties:
 *      - user: User object.
 *      - sensor: sensor object.
 * 
 * In the case that the URL does not match, sensorTest will render the
 * template 'readingNF'.
 */

function readingRender(url, template) {
    readingGet(url, (req, res, user, reading) => {
        reading.values.forEach((value) => {
            value.html = SensorTypes.getOutputTemplate(
                value.type, user, value.data
            );
        });

        Winston.debug('Rendering reading page.', {
            "user": user,
            "reading": reading        
        });

        res.render(template, {
            "user": user,
            "reading": reading
        });
    });
}

// ----------------------------------------------------------------------------

/* Provides a layer to app.get which handles the relevant reading.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 *      - reading: reading object.
 */

function readingGet(url, success) {
    sessionGet(url, function(req, res, user) {
        readingTest(req, res, user, success);
    });
}


// ----------------------------------------------------------------------------

/* Tests if the current reading is valid. Responds if not.
 * Also tests if the current session is valid. (Using sessionTest.)
 * 
 * req: Express request object.
 * res: Express response object.
 * user: User object.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Same as before.
 *      - res: Same as before.
 *      - user: User object.
 */

function readingTest(req, res, user, success) {
    let id = req.originalUrl.split('/')[2];

    Reading.find(id,
        (reading) => { // Success
            success(req, res, user, reading);
        },
        () => { // Failure
            res.render('readingNF', {
                "user": user
            });
        }
    );
}


// ============================================================================
// SENSORS
// ============================================================================

/* Renders a Mustache template with user/sensor information when the
 * URL is matched. A layer for app.get.
 * 
 * url: Express routing URL or regex.
 * template: Mustache template to be rendered in the case of the URL matching.
 * Information will be passed for rendering with the following properties:
 *      - user: User object.
 *      - sensor: sensor object.
 * 
 * In the case that the URL does not match, sensorTest will render the
 * template 'sensorNF'.
 */

function sensorRender(url, template, needsModels) {
    sensorGet(url, (req, res, user, sensor) => {
        let canEdit = Sensor.canEdit(user, sensor);
        let type = sensor.type;
        let typeName = SensorTypes.getTypeName(type);

        let models;
        if (needsModels) models = SensorTypes.getModelsList(type);

        Winston.debug('Rendering sensor page.', {
            "user": user,
            "typeName": typeName,
            "sensor": sensor,
            "models": models,
            "canEdit": canEdit,
            "configuration": req.query.configuration            
        });

        res.render(template, {
            "user": user,
            "typeName": typeName,
            "sensor": sensor,
            "models": models,
            "canEdit": canEdit,
            "configuration": req.query.configuration
        });
    });
}

// ----------------------------------------------------------------------------

/* Provides a layer to app.get which handles the relevant sensor.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 *      - sensor: Sensor object.
 */

function sensorGet(url, success) {
    sessionGet(url, function(req, res, user) {
        sensorTest(req, res, user, success);
    });
}

// ----------------------------------------------------------------------------

/* Provides a layer to app.post which handles the relevant sensor.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 *      - sensor: Sensor object.
 */

function sensorPost(url, success) {
    sessionPost(url, function(req, res, user) {
        sensorTest(req, res, user, success);
    });
}


// ----------------------------------------------------------------------------

/* Tests if the current sensor is valid. Responds if not.
 * Also tests if the current session is valid. (Using sessionTest.)
 * 
 * req: Express request object.
 * res: Express response object.
 * user: User object.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Same as before.
 *      - res: Same as before.
 *      - user: User object.
 */

function sensorTest(req, res, user, success) {
    let id = req.originalUrl.split('/')[2];

    Sensor.find(id,
        (sensor) => { // Success
            success(req, res, user, sensor);
        },
        () => { // Failure
            res.render('sensorNF', {
                "user": user
            });
        }
    );
}

// ============================================================================
// CONFIGURATIONS
// ============================================================================

/* Renders a Mustache template with user/configuration information when the
 * URL is matched. A layer for app.get.
 * 
 * url: Express routing URL or regex.
 * template: Mustache template to be rendered in the case of the URL matching.
 * Information will be passed for rendering with the following properties:
 *      - user: User object.
 *      - configuration: Configuration object.
 * 
 * In the case that the URL does not match, configurationTest will render the
 * template 'configurationNF'.
 */

function configurationRender(url, template, needsSensorList) {
    function fail(error) {
        Winston.debug("Could not render configuration.", {
            "error": error
        });
    }

    configurationGet(url, (req, res, user, configuration) => {
        function render(sensors) {
            let canEdit = Configurations.canEdit(user, configuration);

            Winston.debug('Rendering configuration page.', {
                "user": user,
                "configuration": configuration,
                "canEdit": canEdit,
                "sensors": sensors
            });

            res.render(template, {
                "user": user,
                "configuration": configuration,
                "canEdit": canEdit,
                "sensors": sensors
            });
        }

        if (!needsSensorList) render();

        Configurations.getSensorList(configuration, render, fail);
    });
}

// ----------------------------------------------------------------------------

/* Provides a layer to app.get which handles the relevant configuration.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 *      - configuration: Configuration object.
 */

function configurationGet(url, success) {
    sessionGet(url, function(req, res, user) {
        configurationTest(req, res, user, success);
    });
}

// ----------------------------------------------------------------------------

/* Provides a layer to app.post which handles the relevant configuration.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 *      - configuration: Configuration object.
 */

function configurationPost(url, success) {
    sessionPost(url, function(req, res, user) {
        configurationTest(req, res, user, success);
    });
}

// ----------------------------------------------------------------------------

/* Tests if the current configuration is valid. Responds if not.
 * Also tests if the current session is valid. (Using sessionTest.)
 * 
 * req: Express request object.
 * res: Express response object.
 * user: User object.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Same as before.
 *      - res: Same as before.
 *      - user: User object.
 */

function configurationTest(req, res, user, success) {
    let id = req.originalUrl.split('/')[2];

    Configurations.find(id,
        (configuration) => { // Success
            success(req, res, user, configuration);
        },
        () => { // Failure
            res.render('configurationNF', {
                "user": user
            });
        }
    );
}

// ============================================================================
// SESSION
// ============================================================================

/* Provides a layer to app.post which auto tests for a valid session.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 */

function sessionPost(url, success) {
    app.post(url, (req, res) => {
        sessionTest(req, res, success);
    });
}

/* Provides a layer to app.get which auto tests for a valid session.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 */

function sessionGet(url, success) {
    app.get(url, (req, res) => {
        sessionTest(req, res, success);
    });
}

/* Tests if the current session is valid. Redirects if not.
 * 
 * req: Express request object.
 * res: Express response object.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Same as before.
 *      - res: Same as before.
 *      - user: User object.
 */

function sessionTest(req, res, success) {
    function fail(error) {
        Winston.debug("Session not valid.", {
            "error": error 
        });
        res.redirect('/login');
    }

    if (req.session && req.session.oid) {
        let oid;
        try { oid = ObjectId(req.session.oid); }
        catch(e) { return fail({ "type": "badId", "exception": e }); }
        
        Auth.findOid(oid,
            (user) => { // Success
                success(req, res, user);
            },
            (error) => { // Failure
                fail({
                    "type": "notFound",
                    "error": error,
                    "oid": oid
                });
            }
        );
    } else fail({ "type": "noSession" });
}