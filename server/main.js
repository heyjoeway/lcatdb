const STATIC = __dirname + '/www/';

// ============================================================================
// CONFIG
// ============================================================================

const fs = require('fs');

let configTmp;

try {
    configTmp = require('./config.json');
} catch (e) {
    if (e.code == 'MODULE_NOT_FOUND') {
        console.log('Did not find config file. Copying from "./config.example.json".')
        configTmp = require('./config.example.json');
        fs.writeFileSync('./config.json', JSON.stringify(configTmp, null, '\t'));
    } else throw e;
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

const Schema = require('./Schema.js');
const Configurations = require('./configurations.js');
const Db = require('./DBHandler');
const Sensor = require('./Sensors');
const SensorTypes = require('./SensorTypes');
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
    }
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

app.use((err, req, res, next) => {
    let errorText;

    if (Config.errors.showData) {
        if (!Config.errors.encryptData) {
            errorText = "WARNING: RAW STACK SENT\n\n" + err.stack;
        } else {
            let cipher = Crypto.createCipher(
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

app.use((req, res) => {
    res.status(404).sendFile(STATIC + "404.html");
});