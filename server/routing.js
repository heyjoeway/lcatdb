const RoutingRender = require('./routing.render.js');
const RoutingMisc = require('./routing.misc.js');
const RoutingActions = require('./routing.actions.js');

exports.init = function(app) {
    RoutingRender.init(app);
    RoutingMisc.init(app);
    RoutingActions.init(app);
}