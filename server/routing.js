const RoutingRender = require('./RoutingRender.js');
const RoutingMisc = require('./routing.misc.js');
const RoutingActions = require('./routing.actions.js');

class Routing {
    static init(app) {
        RoutingRender.init(app);
        RoutingMisc.init(app);
        RoutingActions.init(app);
    }
}

module.exports = Routing;