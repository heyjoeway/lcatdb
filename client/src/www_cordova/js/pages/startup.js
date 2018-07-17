LcatDB.Pages.classes.startup = class extends LcatDB.Page {
    onDeviceReady() {
        let navUrl = "./home.html";
        if (LcatDB.LocalStorage.get("userInfo"))
            navUrl = './dashboard.html';

        LcatDB.Pages.navigate(navUrl, true, true);
    }

    init() {
        LcatDB.userInfo.get(gotNewInfo => {
            if (window.cordova) this.onDeviceReady();
            else document.addEventListener(
                'deviceready', () => this.onDeviceReady(), false
            );
        }, true);
    }
};