const RoutingRender = require('./RoutingRender');
const RoutingMisc = require('./RoutingMisc');
const RoutingActions = require('./RoutingActions');

class Routing {
    static init(app) {
        RoutingRender.init(app);
        RoutingMisc.init(app);
        RoutingActions.init(app);
    }
}

module.exports = Routing;