import OfflineEventQueue from "./OfflineEventQueue";

LcatDB.Platform.isWebsite = false;

LcatDB.App = class {
    static init() {
        LcatDB.App.offlineEventQueue = new OfflineEventQueue();
    }
};