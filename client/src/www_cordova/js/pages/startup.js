LcatDB.Pages.classes.startup = class extends LcatDB.Page {
    init() {
        LcatDB.offlineInfo.get(true, gotNewInfo => {
            if (localStorage["LcatDB.offlineInfo"])
                history.replaceState({}, '<!--title--> - Dashboard', './dashboard.html');
            else
                history.replaceState({}, '<!--title--> - Home', './home.html');

            location.reload();
        });
    }
};