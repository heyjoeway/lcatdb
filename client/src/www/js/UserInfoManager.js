LcatDB.UserInfoManager = class {
    constructor() {
        this.block = false;
        this.callbacks = new LcatDB.Utils.CallbackChannel();
        this.get();
    }

    /**
     * Gets info necessary for offline operation
     * 
     * @param force 
     * @param {function} callback Params: gotNewInfo {boolean}
     */
    get(callback, force = false) {
        const OFFLINE_CACHE_TIME = 5 * 60 * 1000; // milliseconds

        this.callbacks.add(callback);
        
        if (this.block) return;
        this.block = true;

        let noUser = $(`meta[name='app:noUser']`).prop("content") == "true";
        if (noUser) {
            this.clear();
            this.finish(false);
        }
        
        let infoCurrent = this.info();
        if (infoCurrent && !force) {
            let timeCurrent = new Date().getTime();
            let cacheExpired = infoCurrent.time - timeCurrent >= OFFLINE_CACHE_TIME;
            if (!cacheExpired)
                return this.finish(false);
        }
    
        if (!navigator.onLine) return this.finish(false);
    
        LcatDB.InputBlock.start();
        
        $.ajax({
            "url": `${LcatDB.serverUrl}/api/offlineData`,
            "dataType": "json",
            "cache": false,
            "timeout": 4500,
            "method": "POST",
            "success": (data, status) => {
                if (status != 'success')
                    return this.finish(false);

                if (data.error) {
                    if (data.error.errorName == 'noSession') {
                        this.clear();
                        LcatDB.InputBlock.finish(-1);
                        let mustLogin = $(`meta[name='app:mustLogin']`).prop("content") == "true";
                        if (mustLogin) LcatDB.Platform.openLoginModal();
                    }
                    return this.finish(false);
                }

                LcatDB.LocalStorage.put("userInfo", data);

                if (LcatDB.offlineEventQueue)
                    LcatDB.offlineEventQueue.loadEvents();
    
                this.finish(true);
            },
            "error": () => {
                this.finish(false);
            }
        });
    }

    finish(gotNewInfo) {
        this.callbacks.run(gotNewInfo);
        this.callbacks.clear();
    
        this.block = false;
        LcatDB.InputBlock.finish();
    }
    
    info() { return LcatDB.LocalStorage.get("userInfo"); }
    getCurrentUserId() { return LcatDB.LocalStorage.get("userInfo.user._id"); }
    expire() { LcatDB.LocalStorage.put("userInfo.time", 0); }
    clear() { LcatDB.LocalStorage.delete("userInfo"); }
};