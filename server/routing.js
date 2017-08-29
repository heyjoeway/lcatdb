const Winston = require('winston');
const ObjectId = require('mongodb').ObjectId; 

const Utils = require('./utils.js');
const Auth = require('./auth.js');
const Configurations = require('./configurations.js');
const Sensor = require('./sensor.js');
const SensorTypes = require('./sensorTypes.js');
const Reading = require('./reading.js');

exports.init = function(app) {

// ============================================================================
// MISC
// ============================================================================

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// ------------------------------------
// Homepage (page)
// ------------------------------------

// If user is logged in, show them their dashboard.
// Otherwise, just show the homepage.
app.get('/', (req, res) => {
    if (req.session && req.session.oid) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/home.html');
    }
});

// ------------------------------------
// Login (page)
// ------------------------------------

app.get('/login', (req, res) => {
    let data = {
        "invalid": typeof(req.query.invalid) != typeof(undefined)
    };

    res.render('login', data);

    Winston.debug("Login page accessed.", {
        "data": data
    });
});

// ------------------------------------
// Login (action)
// ------------------------------------

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

// ------------------------------------
// Register (page)
// ------------------------------------

app.get('/register', (req, res) => {
    req.session.reset();

    // let data = { "anyErrors": false };
    let data = {};

    for (var key in req.query) {
        data[key] = true;
        // data.anyErrors = true;
    }

    Winston.debug("Registration page accessed.", { "data": data });

    res.render('register', data);
});

// ------------------------------------
// Register (action)
// ------------------------------------

app.post('/registerdo', (req, res) => {
    Auth.register(req.body,
        (oid) => { // Success
            req.session.oid = oid.toString();

            if (typeof req.query.quick != 'undefined')
                res.redirect('/tutorial/standard');
            else
                res.redirect('/tutorial');
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



// ------------------------------------
// Logout (action)
// ------------------------------------

app.all('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/');
});

function sessionRender(url, template, allowAnon) {
    Winston.debug('Rendering session page.', {
        "template": template
    });

    sessionGet(url, (req, res, user) => {
        res.render(template, {
            "user": user,
            "query": req.query
        });
    }, allowAnon);
}

// ------------------------------------
// Dashboard (page)
// ------------------------------------

sessionRender('/dashboard', 'dashboard');
sessionRender('/tutorial', 'tutorial');
sessionRender('/visualize', 'visualize', true);
sessionRender('/map', 'map', true);
sessionRender('/map/*', 'map', true);

sessionGet('/tutorial/standard', (req, res, user) => {
    Configurations.getList(user, (list) => {
        if (!Utils.exists(list)) {
            Configurations.new(user, (cid) => {
                res.redirect(`/configurations/${cid}/tutorial`);
            });
        } else res.redirect('/configurations?reading');
    });
});

// ============================================================================
// SESSIONS
// ============================================================================

/* Tests if the current session is valid. Redirects if not.
 * 
 * req: Express request object.
 * res: Express response object.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Same as before.
 *      - res: Same as before.
 *      - user: User object.
 */

function sessionTest(req, res, success, allowAnon) {
    function fail(error) {
        Winston.debug("Session not valid.", {
            "error": error 
        });
        res.redirect('/login');
    }

    if (req.session && req.session.oid) {
        let oid = Utils.testOid(req.session.oid, fail);
        if (!oid) return;
        
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
    } else if (allowAnon) return success(req, res);
    else fail({ "type": "noSession" });
}

// ----------------------------------------------------------------------------

/* Provides a layer to app.post which auto tests for a valid session.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 */

function sessionPost(url, success, allowAnon) {
    app.post(url, (req, res) => {
        sessionTest(req, res, success, allowAnon);
    });
}

// ----------------------------------------------------------------------------

/* Provides a layer to app.get which auto tests for a valid session.
 * 
 * url: Express routing URL or regex.
 * success: Callback run upon successful session test. Parameters are:
 *      - req: Express request object.
 *      - res: Express response object.
 *      - user: User object.
 */

function sessionGet(url, success, allowAnon) {
    app.get(url, (req, res) => {
        sessionTest(req, res, success, allowAnon);
    });
}



// ============================================================================
// SENSORS
// ============================================================================

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

function sensorRender(url, template, needs) {
    function fail(error) {
        Winston.debug('Error preparing sensor for mustache.', {
            "error": error
        });
        failure(error);
    }
    
    sensorGet(url, (req, res, user, sensor) => {
        let canEdit = Sensor.canEdit(user, sensor);
        Sensor.mustachify(user, sensor,
            (data) => {
        
                Winston.debug('Rendering sensor page.', {
                    "canEdit": canEdit,
                    "configuration": req.query.configuration            
                });

                res.render(template, {
                    "user": user,
                    "sensor": sensor,
                    "data": data,
                    "canEdit": canEdit,
                    "configuration": req.query.configuration
                });
            },
            fail, needs
        );
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
// Routes
// ----------------------------------------------------------------------------

// ------------------------------------
// Sensor List (page)
// ------------------------------------

sessionGet('/sensors', (req, res, user) => {
    Sensor.getList(user, 
        (sensors) => { // Success
            sensors.forEach((sensor) => {
                sensor.typeData = SensorTypes.getTypeData(sensor.type);
            });
            res.render('sensorList', {
                "sensors": sensors,
                "user": user
            });
        },
        (error) => { // Failure
            res.send(`Unknown error. (${error.type})`);
        },
        ['name', 'model', 'type'] // Requirements
    );
});

// ------------------------------------
// Sensors (Pages)
// ------------------------------------

let sensorPattern = '([0-9a-f]{24})';

sensorRender(`/sensors/${sensorPattern}`, 'sensor', ['edits.time', 'type', 'owner']);
sensorRender(`/sensors/${sensorPattern}/edit`, 'sensorEdit', ['models']);

// ------------------------------------
// New Sensor (Page)
// ------------------------------------

sessionGet('/sensors/new', (req, res, user) => {
    let types = SensorTypes.getTypesMustache();

    res.render('sensorNew', {
        "user": user,
        "types": types,
        "typeFirst": types[0].key,
        "query": req.query
    });
});

// ------------------------------------
// Sensor edit (action)
// ------------------------------------

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

// ------------------------------------
// New Sensor (action)
// ------------------------------------

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
// CONFIGURATIONS
// ============================================================================

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

function configurationRender(url, template, needs) {
    function fail(error) {
        Winston.debug("Could not render configuration.", {
            "error": error
        });
    }

    configurationGet(url, (req, res, user, configuration) => {
        let canEdit = Configurations.canEdit(user, configuration);
        Configurations.mustachify(user, configuration,
            () => {

                Winston.debug('Rendering configuration page.', {
                    "canEdit": canEdit
                });

                res.render(template, {
                    "user": user,
                    "configuration": configuration,
                    "canEdit": canEdit,
                    "query": req.query
                });
            },
            fail, needs, req.query
        );

    });
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// ------------------------------------
// Configuration List (page)
// ------------------------------------

sessionGet('/configurations', (req, res, user) => {
    Configurations.getList(user, (docs) => {
        let reading = typeof req.query.reading != 'undefined';

        if (reading && docs.length == 1)
            return res.redirect(`/configurations/${docs[0]['_id']}/reading`);
        
        res.render('configurationList', {
            "configurations": docs,
            "reading": reading,
            "user": user
        });
    });
});

// ------------------------------------
// Configuration (pages)
// ------------------------------------

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

configurationRender(`/configurations/${configPattern}`, 'configuration', ['sensors', 'sensors.typeData', 'edits.time', 'owner']);
configurationRender(`/configurations/${configPattern}/tutorial`, 'configurationTutorial', ['sensors', 'sensors.typeData']);
configurationRender(`/configurations/${configPattern}/edit`, 'configurationEdit');
configurationRender(`/configurations/${configPattern}/addSensor`, 'addSensor', ['user.sensors', 'user.sensors.typeData']);
configurationRender(`/configurations/${configPattern}/readings`, 'configurationReadingList', ['readings']);

// ------------------------------------
// New configuration (action)
// ------------------------------------

sessionGet('/configurations/new', (req, res, user) => {
    Configurations.new(user, (id) => {
        res.redirect(`/configurations/${id}/edit`);
    });
});


// ------------------------------------
// Configuration edit (action)
// ------------------------------------

sessionPost(`/configurations/${configPattern}/editDo`, (req, res, user) => {
    let cid = req.originalUrl.split('/')[2];

    Configurations.edit(
        {
            "user": user,
            "cid": cid,
            "edit": req.body
        },
        () => { res.redirect(`/configurations/${cid}`); },
        (error) => { res.send(`Error processing request. (${error.type})`); }
    );
});


// ------------------------------------
// Add Sensor to Configuration (action)
// ------------------------------------

sessionPost(`/configurations/${configPattern}/addSensorDo`, (req, res, user) => {
    function fail(error) {
        res.send(`Error processing request. (${error.type})`);
    }

    let cid = req.originalUrl.split('/')[2];
    let sid = req.body.sid;

    Configurations.addSensor(user, cid, sid,
         () => { res.redirect(`/configurations/${cid}`); },
         fail
    );
});

// ------------------------------------
// Submit a Reading (Page)
// ------------------------------------

configurationGet(`/configurations/${configPattern}/reading`, (req, res, user, configuration) => {
    Configurations.getSensorList(configuration, 
        (sensors) => {
            let canEdit = Configurations.canEdit(user, configuration);

            sensors.forEach((sensor, i) => {
                sensor.html = SensorTypes.getInputTemplate(
                    sensor.type, user, configuration, sensor
                );

                sensor.index = i;
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

// ------------------------------------
// Submit a Reading (Action)
// ------------------------------------

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

    if (!Utils.exists(oldValues)) {
        return Reading.new(
            user,
            configuration,
            newData,
            success,
            fail
        );
    }

    let valueKeys = Object.keys(oldValues);
    let valuesLeft = valueKeys.length; 
    let hasFailed = false;

    valueKeys.forEach((key) => {
        let sid = ObjectId(key);
        Sensor.find(sid,
            (sensor) => {
                if (hasFailed) return;
                newData.values.push({
                    "sensor": sid.toString(),
                    "type": sensor.type,
                    "data": oldValues[key]
                });


                if (--valuesLeft == 0) {
                    Reading.new(
                        user,
                        configuration,
                        newData,
                        success,
                        fail
                    );
                }
            },
            (error) => {
                if (hasFailed) return;
                fail({ "type": "sensorFind", "error": error });
                hasFailed = true;
            }
        );
    });

});

// ------------------------------
// Reading Export
// ------------------------------

configurationGet(`/configurations/${configPattern}/readingsExport`, (req, res, user, configuration) => {
    function fail(error) {
        Winston.debug('Error exporting data.', {
            "error": error
        });
        res.send(`Error exporting data. (${error.type})`);
    }

    let format = req.query.format || 'json';
    format = format.toLowerCase();

    if (!(['json', 'csv']).includes(format))
        fail({ "type": "unknownFormat" });

    Reading.findConfiguration(configuration['_id'],
        (list) => {
            list.sort((a, b) => {
                let timeA = parseInt(a.timeCreated);
                let timeB = parseInt(b.timeCreated);
                if (timeA < timeB) return -1;
                if (timeA > timeB) return 1;
                return 0;
            });


            if (format == 'json') res.send(JSON.stringify(list));
        },
        (error) => {
            fail({ "type": "findConfiguration", "error": error });
        }
    ); 
});

// ============================================================================
// READINGS
// ============================================================================

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
    let id = req.originalUrl.split('/')[2].split('?')[0];

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

function readingGet(url, success, allowAnon) {
    sessionGet(url, function(req, res, user) {
        readingTest(req, res, user, success);
    }, allowAnon);
}

// ----------------------------------------------------------------------------

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

function readingRender(url, template, allowAnon) {
    readingGet(url, (req, res, user, reading) => {
        reading.values.forEach((value) => {
            try {
                value.html = SensorTypes.getOutputTemplate(
                    value, user,
                );
            } catch(e) {
                value.html = '<span class="error">ERROR: Could not retrieve template for value.</span>';
            }
        });

        Winston.debug('Rendering reading page.', {
            "user": user,
            "reading": reading        
        });

        res.render(template, {
            "user": user,
            "reading": reading,
            "query": req.query
        });
    }, allowAnon);
}

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

// ------------------------------------
// Reading (Page)
// ------------------------------------

let readingPattern = '([0-9a-f]{24})';

readingRender(`/readings/${readingPattern}`, 'reading', true);

}; // End init()