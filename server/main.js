/*
 * Alright, let's just get some conventions out of the way, both for myself and
 * for anyone working with this in the future:
 * 
 * - UseCamelCase. No_snake_case.
 * - Do not do ANYTHING synchronously. Do everything async.
 *   - In terms of I/O, anyway.
 *   - Except for the initial config loading.
 * - Always use Winston for logging. Only use console.log for >>very<<
 *   temporary debugging.
*/

const STATIC = __dirname + '/www/';

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
const Crypto = require('crypto');

// ----------------------------------------------------------------------------
// Champy-DB specific modules
// ----------------------------------------------------------------------------

const Schema = require('./schema.js');
const Configurations = require('./configurations.js');
const Db = require('./db.js');
const Sensor = require('./sensor.js');
const SensorTypes = require('./sensorTypes.js');
const Reading = require('./reading.js');
const Routing = require('./routing.js');
const Api = require('./api.js');

const Email = require('./email.js');
Email.init(Config.email);

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
app.use(Express.static(STATIC));

// ============================================================================
// ROUTING INIT
// ============================================================================

Routing.init(app);
Api.init(app);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(function(err, req, res, next) {
    var errorText;

    if (Config.errors.showData) {
        if (!Config.errors.encryptData) {
            errorText = "WARNING: RAW STACK SENT\n\n" + err.stack;
        } else {
            var cipher = Crypto.createCipher(
                Config.errors.encryptAlgorithm,
                Config.errors.encryptPassword
            );
            errorText = cipher.update(err.stack, 'utf8', 'hex');
            errorText += cipher.final('hex');
        }
    }

    Winston.error(err.stack);
    res.status(500).render('error', {
        "error": errorText
    });
});

app.use(function (req, res) {
    res.status(404).sendFile(STATIC + "404.html");
});