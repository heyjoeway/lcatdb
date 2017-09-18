const RoutingRender = require('./routing.render.js');
const RoutingMisc = require('./routing.misc.js');
const RoutingOld = require('./routing.old.js');

exports.init = function(app) {
    RoutingRender.init(app);
    RoutingMisc.init(app);
    RoutingOld.init(app);
}