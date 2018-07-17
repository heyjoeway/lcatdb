window.LcatDB = {};
LcatDB.serverUrl = '<!--url-->';

require('./polyfill.js');
require('./Utils.js');

require('./UnitSystem.js');
require('./Platform.js');
require('./InputBlock.js');

require('./Sidebar.js');
require('./UserInfoManager.js');
require('./LocalStorage.js');
require('./Migrate.js');

require('./Page.js');

require('./QueryMap.js');
require('./MapsCommon.js');

require('./Modal.js');
require('./ModalsCommon.js');

require("./OfflineEvent.js");
require("./OfflineEventPost.js");
require("./OfflineEventReading.js");
require("./OfflineEventQueue.js");

require('./app.js');

// ============================================================================

window.$ = require("jquery");
window.jQuery = $;

require('jquery-backstretch');
require('form-serializer');
require('jquery-validation');
require('iframe-resizer');
require('jquery-unitnorm');
require("jquery-spoiler")($);
require('jquery-deserialize');

window.MobileDetect = require("mobile-detect");

require('bootstrap');
require('bootstrap-notify');
require('bootstrap-show-password');
require('bootstrap-datetimepicker-npm');
require("bootstrap-select");

window.Mustache = require("mustache");
window.vis = require("vis");
window.L = require('leaflet');

require("./lib/L.TileLayer.PouchDBCached.js");
require("./lib/modernizr-custom.js");
window.PouchDB = require("./lib/pouchdb-5.4.5.min.js");

// ============================================================================

LcatDB.init = function() {
    LcatDB.InputBlock.init();
    
    if (window.parent == window)
        LcatDB.Migrate.init();
    
    LcatDB.userInfo = new LcatDB.UserInfoManager();

    if (window.parent == window) {
        LcatDB.offlineEventQueue = new LcatDB.OfflineEventQueue();
        LcatDB.Sidebar.update();
    }

    LcatDB.App.init();
    LcatDB.Pages.init();
};

$('document').ready(function() { LcatDB.init(); });
