LcatDB.LocalStorage = class {
    static getCurrentData() {
        let currentData = {};
        try {
            currentData = JSON.parse(localStorage["LcatDB"]);
        } catch (e) { }
        return currentData;
    }

    static getUserPath(path, user) {
        if (!user) return path
        else if (user === true)
            user = LcatDB.userInfo.getCurrentUserId();
        
        return path = `users.${user}.${path}`;
    }

    static get(path = '', user) {
        return LcatDB.Utils.getPropertyByPath(
            LcatDB.LocalStorage.getCurrentData(),
            LcatDB.LocalStorage.getUserPath(path, user)
        );
    }

    static put(path, val, user) {
        let currentData = LcatDB.LocalStorage.getCurrentData();
        LcatDB.Utils.setPropertyByPath(
            currentData,
            LcatDB.LocalStorage.getUserPath(path, user),
            val
        );
        localStorage["LcatDB"] = JSON.stringify(currentData);
    }

    static delete(path, user) {
        this.put(path, undefined, user);
    }

    static deleteAll() {
        localStorage["LcatDB"] = '{}';
    }
};