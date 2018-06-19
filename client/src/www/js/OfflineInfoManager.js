LcatDB.OfflineInfoManager = class {
    constructor() {
        this.block = false;
        this.callbacks = [];
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
    
        if (callback) this.callbacks.push(callback);
    
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
                    if (data.error.errorName == 'noSession')
                        localStorage["LcatDB.offlineInfo"] = '';
                    return this.finish(false);
                }

                localStorage["LcatDB.offlineInfo"]  = JSON.stringify(data);
                this.finish(true);
            },
            "error": () => {
                this.finish(false);
            }
        });
    }

    finish(gotNewInfo) {
        this.callbacks.forEach((callback) => {
            callback(gotNewInfo);
        });
        this.callbacks = [];
    
        this.block = false;
        LcatDB.InputBlock.finish();
    }
    
    info() {
        if (localStorage["LcatDB.offlineInfo"])
            return JSON.parse(localStorage["LcatDB.offlineInfo"]);
    }

    expire() {
        let info = this.info();
        info.time = 0;
        localStorage["LcatDB.offlineInfo"] = JSON.stringify(info);
    }
};