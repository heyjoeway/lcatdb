LcatDB.Navbar = class {
    /*
     * Remove current navbar and re-render (with user info).
     */
    static update() {
        LcatDB.offlineInfo.get(gotNewInfo => {
            let configurationId = $("#configuration-picker").val();
            let info = LcatDB.offlineInfo.info();
            if (typeof info != "undefined") {
                let navbarRender = Mustache.render(`<!--nav_user-->`, info);
    
                $('#navbar').remove();
                $('#sidebar').remove();
                $('#navbar-top-bg').remove();
                $('body').append(navbarRender);
            }

            LcatDB.Platform.handleOnline(true);
            LcatDB.Platform.initNavigation();
            
            LcatDB.Sidebar.init();
        });
    };
}
