const RoutingRender = require('./RoutingRender');
const RoutingMisc = require('./RoutingMisc');
const RoutingActions = require('./RoutingActions');

exports.init = function(app) {
    RoutingRender.init(app);
    RoutingMisc.init(app);
    RoutingActions.init(app);
};