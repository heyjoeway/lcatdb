/*
 * Alright, let's just get some conventions out of the way, both for myself and
 * for anyone working with this in the future:
 * 
 * - UseCamelCase. No_snake_case.
 * - Prefer using ' for quotations. Only use " in objects.
 * - All relative paths should begin with './'. Even in dialogue.
 * - All filesystem paths should end with '/', if they point to a directory.
 * - Do not do ANYTHING synchronously. Do everything async.
 *   - Except for the initial config loading.
 * - Always use winston for logging. Only use console.log for >>very<<
 *   temporary debugging.
 * - Write all JS objects in valid JSON format. Use quotes (") around keys.
*/

const STATIC = __dirname + '/public/';

// ============================================================================
// CONFIG INIT
// ============================================================================

const fs = require('fs');

var configTmp;

try {
    configTmp = require('./config.json');
} catch (e) {
    if (e.code == 'MODULE_NOT_FOUND') {
        console.log('Did not find config file. Copying from "./config.example.json".')
        configTmp = require('./config.example.json');
        fs.writeFileSync('./config.json', JSON.stringify(configTmp));
    } else {
        throw e;
    }
};

const Config = JSON.parse(JSON.stringify(configTmp));
delete configTmp;

// ============================================================================
// IMPORT INIT
// ============================================================================

const Winston = require('winston');
Winston.level = Config.log.level;

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId; // Used for getting internal MongoDB post ids

const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const validate = require('jsonschema').validate;

const Session = require('client-sessions');

const Auth = require('./auth.js');

// ============================================================================
// Mongo/Express init
// ============================================================================

var db;

// Connect to database.
MongoClient.connect(
    Config.db.uri,
    (error, database) => {
	    if (error) return Winston.error(
            'Could not connect to database.', { "error": error }
        );

	    db = database;

        // Initialize HTTP server.
	    app.listen(Config.port, () => {
		    Winston.info('Server listening.', { "port" : Config.port });
	    });
    }
);

// ============================================================================
// Express setup
// ============================================================================

app.use(Session({
    cookieName: 'session',
    secret: Config.session.secret,
    duration: Config.session.duration,
    activeDuration: Config.session.ac
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.get('')

// ----------------------------------------------------------------------------

app.get('/login', function(req, res) {
    // TODO: Handle invalid login
    res.sendFile(STATIC + 'login.html');
});

// ----------------------------------------------------------------------------

app.get('/register', function(req, res) {
    // TODO: Handle invalid login
    res.sendFile(STATIC + 'register.html');
});

// ----------------------------------------------------------------------------

app.post('/registerdo', (req, res) => { Auth.register(req, res, db); });
app.post('/logindo', (req, res) => { Auth.login(req, res, db); });
app.get('/logout', Auth.logout);

// ----------------------------------------------------------------------------

sessionGet('/dashboard', function(req, res, body) {
    res.send('YAY');
});

// ----------------------------------------------------------------------------

// Callback takes parameters req, res, and body
function sessionGet(url, callback) {
    app.get(url, function(req, res) {
        sessionTest(req, res, callback);
    });
}

function sessionTest(req, res, success) {
    if (req.session && req.session.username) {
        db.collection('users').findOne(
            {'username': req.session.username},
            function(err, body) {
                success(req, res, body);
            }
        );
    } else {
        res.redirect('/login');
    }
}