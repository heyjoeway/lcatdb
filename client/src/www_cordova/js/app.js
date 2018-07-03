LcatDB.Platform.isWebsite = false;

LcatDB.App = class {
    static init() {
        LcatDB.App.offlineEventQueue = new LcatDB.App.OfflineEventQueue();
    }
    
    static initElements() {
        $(".cordova_only_hide").show();
    }
};

require("./pages/queue.js");
require("./pages/startup.js");

require("./OfflineEvent.js");
require("./OfflineEventPost.js");
require("./OfflineEventQueue.js");