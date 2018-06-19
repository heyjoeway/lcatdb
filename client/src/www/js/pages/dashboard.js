LcatDB.Pages.classes.dashboard = class extends LcatDB.Page {
	init() {
	    let queryObj = LcatDB.Utils.urlQueryObj(window.location.href);

	    ["verifySuccess", "verifyFailure"].forEach(function(key) {
	        if (queryObj[key]) $('#' + key).show();
	    });

	    LcatDB.Navbar.update();
	}
};