LcatDB.Pages.classes.startup = class extends LcatDB.Page {
    onDeviceReady() {
        let navUrl = "./home.html";
        if (localStorage["LcatDB.offlineInfo"])
            navUrl = './dashboard.html';

        LcatDB.Pages.navigate(navUrl, true, true);
    }

    init() {
        LcatDB.offlineInfo.get(gotNewInfo => {
            if (window.cordova) this.onDeviceReady();
            else document.addEventListener(
                'deviceready', () => this.onDeviceReady(), false
            );
        }, true);
    }
};