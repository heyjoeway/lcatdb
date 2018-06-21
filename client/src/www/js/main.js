window.LcatDB = {};

LcatDB.serverUrl = '<!--url-->';

require('./polyfill.js');
require('./Utils.js')

require('./UnitSystem.js');
require('./Platform.js');
require('./InputBlock.js');

require('./Sidebar.js');
require('./OfflineInfoManager.js');

require('./Navbar.js');
require('./Page.js');

require('./QueryMap.js');
require('./MapsCommon.js');

require('./Modal.js');
require('./ModalsCommon.js');

require('./app.js');

// ============================================================================

window.$ = require("jquery");
window.jQuery = $;

require('jquery-backstretch');
require('form-serializer');
require('jquery-validation');
require('iframe-resizer');

window.MobileDetect = require("mobile-detect");

require('bootstrap');
require('bootstrap-notify');
require('bootstrap-show-password');
require('bootstrap-datetimepicker-npm');

window.Mustache = require("mustache");
window.vis = require("vis");
window.L = require('leaflet');

require("./lib/bootstrap-select.min.js");
require("./lib/jquery.spoiler.min.js")($);
require("./lib/jQuery.unitnorm.js");
require("./lib/L.TileLayer.PouchDBCached.js");
require("./lib/modernizr-custom.js");
require("./lib/pouchdb-5.4.5.min.js");

// ============================================================================

LcatDB.init = function() {
    LcatDB.InputBlock.init();
    
    if (window.parent == window) {
        LcatDB.offlineInfo = new LcatDB.OfflineInfoManager();
        LcatDB.Navbar.update();
    }

    LcatDB.Pages.init();
};

$('document').ready(function() { LcatDB.init(); });