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

LcatDB.init = function() {
	LcatDB.UnitSystem.init();
    LcatDB.Platform.init();
    LcatDB.InputBlock.init();
    LcatDB.MapsCommon.init();
    
    if (window.parent == window) {
        LcatDB.Sidebar.init();
        LcatDB.offlineInfo = new LcatDB.OfflineInfoManager();
        LcatDB.Navbar.update();
        LcatDB.ModalsCommon.init();
    }

    LcatDB.Pages.init();
};

$('document').ready(function() { LcatDB.init(); });