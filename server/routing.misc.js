const Configurations = require('./configurations.js');
const Utils = require('./utils.js');
const Chain = Utils.Chain;
const RoutingCore = require('./routing.core.js');

exports.init = function(app) {

// ------------------------------------
// Homepage (page)
// ------------------------------------

// If user is logged in, show them their dashboard.
// Otherwise, just show the homepage.

app.get('/', (req, res) => {
    if (req.session && req.session.oid)
        res.redirect('/dashboard');
    else
        res.redirect('/home.html');
});

// ------------------------------------
// Tutorial (page)
// ------------------------------------

// If user has any configurations, pass them on to take a reading.
// Otherwise, bring them to the tutorial with a new configuration.

app.get('/tutorial/standard', (req, res) => {
    let data = {};

    new Chain(function() {
        RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
    }, function() {
        if (data.user)
            Configurations.getList(data.user, this.next.bind(this));
        else
            res.redirect('/login');
    }, function(list) {
        if (!Utils.exists(list)) {
            Configurations.new(data.user, (cid) => {
                res.redirect(`/configurations/${cid}/tutorial`);
            });
        } else res.redirect('/configurations?reading=true');
    });
});

app.get('/configurations', (req, res) => {
    let data = {};

    new Chain(function() {
        RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
    }, function() {
        if (data.user)
            Configurations.getList(data.user, this.next.bind(this));
        else
            res.redirect('/login');
    }, function(list) {
        data.configurations = list;
        RoutingCore.stepQuery(req, res, data, {}, this.next.bind(this));
    }, function() {
        let reading = typeof data.query.reading != 'undefined';

        if (reading && data.configurations && data.configurations.length == 1)
            res.redirect(`/configurations/${data.configurations[0]['_id']}/reading`);
        else
            res.render('configurationList', data);
    });
});

app.get('/login', (req, res) => {
    let data = {};

    new Chain(function() {
        RoutingCore.stepUser(req, res, data, {}, this.next.bind(this));
    }, function() {
        if (data.user)
            return res.redirect('/dashboard');

        RoutingCore.stepQuery(req, res, data, {}, this.next.bind(this));
    }, function(list) {
        res.redirect('/login.html?' + data.queryString);
    });

    RoutingCore.stepUser(req, res, data, {}, function() {

    });
});

}