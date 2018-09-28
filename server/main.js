const STATIC = __dirname + '/www/';

// ============================================================================
// CONFIG
// ============================================================================

const fs = require('fs');

let configTmp;

try {
    configTmp = require('./config.json');
} catch(e) {
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

const Express = require('express');
const bodyParser = require('body-parser');
const Session = require('client-sessions');

const mustache = require('mustache-express');
const Crypto = require('crypto');

// ----------------------------------------------------------------------------
// Champy-DB specific modules
// ----------------------------------------------------------------------------

const Schema = require('./Schema');
const Db = require('./DBHandler');
const SensorTypes = require('./SensorTypes');
const Routing = require('./Routing');
const Api = require('./Api');
const Email = require('./Email');

// ============================================================================
// EXPRESS INIT
// ============================================================================

const app = Express();

app.use(Session({
    cookieName: 'session',
    secret: Config.session.secret,
    duration: Config.session.duration,
    activeDuration: Config.session.activeDuration
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
// ROUTING INIT
// ============================================================================

Email.init(Config.email);
Schema.init();
SensorTypes.init();
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