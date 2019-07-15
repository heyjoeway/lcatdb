import AppStorage from "./AppStorage";
import Platform from "./Platform";
import InputBlock from "./InputBlock";
import Utils from "./Utils";
import OfflineEventQueue from "./OfflineEventQueue";
import LoginModal from "./LoginModal";

class UserInfo {
    static init() {
        UserInfo.block = false;
        UserInfo.callbacks = new Utils.CallbackChannel();
        UserInfo.get();
    }

    /**
     * Gets info necessary for offline operation.
     * 
     * @param force 
     * @param {function} callback Params: gotNewInfo {boolean}
     */
    static get(callback, force = false) {
        const OFFLINE_CACHE_TIME = 5 * 60 * 1000; // milliseconds

        UserInfo.callbacks.add(callback);
        
        if (UserInfo.block) return;
        UserInfo.block = true;

        let noUser = $(`meta[name='app:noUser']`).prop("content") == "true";
        if (noUser) {
            UserInfo.clear();
            UserInfo.finish(false);
        }
        
        let infoCurrent = UserInfo.info;
        if (infoCurrent && !force) {
            let timeCurrent = new Date().getTime();
            let cacheExpired = infoCurrent.time - timeCurrent >= OFFLINE_CACHE_TIME;
            if (!cacheExpired)
                return UserInfo.finish(false);
        }
    
        if (!navigator.onLine) return UserInfo.finish(false);
    
        InputBlock.start();
        
        $.ajax({
            "url": `${Platform.serverUrl}/api/offlineData`,
            "dataType": "json",
            "cache": false,
            "timeout": 4500,
            "method": "POST",
            "success": (data, status) => {
                if (status != 'success')
                    return UserInfo.finish(false);

                if (data.error) {
                    if (data.error.errorName == 'noSession') {
                        UserInfo.clear();
                        InputBlock.finish(-1);
                        let mustLogin = $(`meta[name='app:mustLogin']`).prop("content") == "true";
                        if (mustLogin) LoginModal.open();
                    }
                    return UserInfo.finish(false);
                }

                AppStorage.put("userInfo", data);

                if (OfflineEventQueue.initialized)
                    OfflineEventQueue.loadEvents();
    
                UserInfo.finish(true);
            },
            "error": () => {
                UserInfo.finish(false);
            }
        });
    }

    static finish(gotNewInfo) {
        UserInfo.callbacks.run(gotNewInfo);
        UserInfo.callbacks.clear();
    
        UserInfo.block = false;
        InputBlock.finish();
    }
    
    static get info() { return AppStorage.get("userInfo"); }
    static get currentUserId() { return AppStorage.get("userInfo.user._id"); }
    static expire() { AppStorage.put("userInfo.time", 0); }
    static clear() { AppStorage.delete("userInfo"); }
}

export default UserInfo;