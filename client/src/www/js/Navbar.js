LcatDB.Navbar = class {
    /*
     * Remove current navbar and re-render (with user info).
     */
    static update() {
        LcatDB.offlineInfo.get(function(gotNewInfo) {
            try {
                let configurationId = $("#configuration-picker").val();
                let navbarRender = Mustache.render(
                    `<!--nav_user-->`,
                    LcatDB.offlineInfo.info()
                );
    
                $('#navbar').remove();
                $('#sidebar').remove();
                $('#navbar-top-bg').remove();
                $('body').append(navbarRender);
    
                LcatDB.Platform.handleOnline(true);
                LcatDB.Platform.initNavigation();
                
                LcatDB.Sidebar.init();

            } catch(e) {}
        });
    };
}
