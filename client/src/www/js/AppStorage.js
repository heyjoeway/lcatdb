import Utils from "./Utils";

// import UserInfo from "./UserInfo";

class AppStorage {
    /**
     * Get all currently stored LS data relevant to this app. (aka all data in localStorage['LcatDB'])
     * 
     * @returns {object}
     */
    static get currentData() {
        let currentData = {};
        try {
            currentData = JSON.parse(localStorage["LcatDB"]);
        } catch (e) { }
        return currentData;
    }


    static getUserPath(path, user) {
        if (!user) return path
        // else if (user === true)
            // user = UserInfo.currentUserId;
        
        return path = `users.${user}.${path}`;
    }

    static get(path = '', user) {
        return Utils.getPropertyByPath(
            AppStorage.currentData,
            AppStorage.getUserPath(path, user)
        );
    }

    static put(path, val, user) {
        let currentData = AppStorage.currentData;
        Utils.setPropertyByPath(
            currentData,
            AppStorage.getUserPath(path, user),
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
}

export default AppStorage;