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
const objectId = require('mongodb').ObjectId; // Used for getting internal MongoDB post ids

const Express = require('express');
const app = Express();
const bodyParser = require('body-parser');

const validate = require('jsonschema').validate;

const Session = require('client-sessions');

const mustache = require('mustache-express');

// Champy-DB specific modules

const Auth = require('./auth.js');

// ============================================================================
// Mongo/Express init
// ============================================================================

var db, users, configurations;

// Connect to database.
MongoClient.connect(
    Config.db.uri,
    (error, database) => {
	    if (error) return Winston.error(
            'Could not connect to database.', { "error": error }
        );

	    db = database;
        
        // Get collections
        users = db.collection('users');
        // configurations = db.collection('configurations');

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

// ----------------------------------------------------------------------------

app.engine('mustache', mustache());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views/');

// app.get('')

// ----------------------------------------------------------------------------

// If user is logged in, show them their dashboard.
// Otherwise, just show the homepage.
app.get('/', function(req, res) {
    if (req.session && req.session.username) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(STATIC + 'home.html');
    }
});

// ----------------------------------------------------------------------------

app.get('/login', function(req, res) {
    let data = {
        "invalid": typeof(req.query.invalid) != typeof(undefined)
    };

    res.render('login', data);

    Winston.debug("Login page accessed.", {
        "data": data
    });
});

// ----------------------------------------------------------------------------

app.get('/register', function(req, res) {
    req.session.reset();

    let data = {
        "anyErrors": false
    };

    for (var key in req.query) {
        data[key] = true;
        data.anyErrors = true;
    }

    Winston.debug("Registration page accessed.", {
        "data": data
    });

    res.render('register', data);
});

// ----------------------------------------------------------------------------

app.post('/registerdo', (req, res) => { Auth.register(req, res, users); });
app.post('/logindo', (req, res) => { Auth.login(req, res, users); });
app.get('/logout', Auth.logout);

// ----------------------------------------------------------------------------

sessionGet('/dashboard', function(req, res, body) {
    res.render('dashboard', body);
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