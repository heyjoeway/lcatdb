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
                        localStorage["LcatDB.userInfo"] = '';
                        LcatDB.InputBlock.finish(-1);
                        let mustLogin = $(`meta[name='app:mustLogin']`).prop("content") == "true";
                        if (mustLogin) LcatDB.Platform.openLoginModal();
                    }
                    return this.finish(false);
                }

                localStorage["LcatDB.userInfo"]  = JSON.stringify(data);
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
    
    info() {
        if (localStorage["LcatDB.userInfo"])
            return JSON.parse(localStorage["LcatDB.userInfo"]);
    }

    expire() {
        let info = this.info();
        info.time = 0;
        localStorage["LcatDB.userInfo"] = JSON.stringify(info);
    }
    
    clear() { localStorage["LcatDB.userInfo"] = ''; }
};