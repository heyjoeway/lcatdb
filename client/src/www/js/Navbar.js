LcatDB.Navbar = class {
    /*
     * Remove current navbar and re-render (with user info).
     */
    static update() {
        LcatDB.offlineInfo.get(function(gotNewInfo) {
            $.get('./templates/navUser.mustache', function(template, status) {
                if (status != 'success') return;
        
                let configurationId = $("#configuration-picker").val();

                let navbarRender = Mustache.render(
                	template,
                	LcatDB.offlineInfo.info()
                );

                $('#navbar').remove();
                $('#sidebar').remove();
                $('#navbar-top-bg').remove();
                $('body').append(navbarRender);

                $("#sidebar_btn").click(function() {
                    setTimeout(LcatDB.Sidebar.show, 1);
                });

                LcatDB.Platform.handleOnline(true);
                LcatDB.Platform.appUrls();
            });
        });
    };
}
