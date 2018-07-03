LcatDB.Pages.classes.startup = class extends LcatDB.Page {
    init() {
        LcatDB.offlineInfo.get(gotNewInfo => {
            let navUrl = "./home.html";
            if (localStorage["LcatDB.offlineInfo"])
                navUrl = './dashboard.html';

            LcatDB.Pages.navigate(navUrl, true, true);
        }, true);
    }
};