LcatDB.Sidebar = class {
    static init() {
        LcatDB.Sidebar.isOpen = false;
        
        $(window).click(LcatDB.Sidebar.hide);
        $("#sidebar_btn").off('click').click(function() {
            setTimeout(LcatDB.Sidebar.open, 1);
        });

        $(".logout").off('click').click(e => {
            e.preventDefault();

            LcatDB.InputBlock.start();
            
            $.post(`${LcatDB.serverUrl}/logout`, () => {
                LcatDB.InputBlock.finish();
                LcatDB.offlineInfo.clear();
                LcatDB.Pages.navigate('./home.html');
            });
        });

        LcatDB.App.initElements();
    }

    static open() {
        $("#sidebar").show();
        $("#sidebar-overlay").removeClass("hide");
        setTimeout(function() {
            $("#sidebar").addClass("sidebar_show");
            $("#sidebar-overlay").removeClass("disabled");
            LcatDB.Sidebar.isOpen = true;
        }, 20);
    }
      
    static hide() {
        if (!LcatDB.Sidebar.isOpen) return;
        LcatDB.Sidebar.isOpen = false;
        $("#sidebar").removeClass("sidebar_show");
        $("#sidebar-overlay").addClass("disabled");    
        setTimeout(function() {
            $("#sidebar").hide();
            $("#sidebar-overlay").addClass("hide");
        }, 250);
    }

    /*
     * Remove current sidebar and re-render (with user info).
     */
    static update() {
        LcatDB.offlineInfo.get(gotNewInfo => {
            let configurationId = $("#configuration-picker").val();
            let info = LcatDB.offlineInfo.info();
            let noUser = $(`meta[name='app:noUser']`).prop("content") == "true";

            let navRender;

            if ((typeof info != "undefined") && !noUser)
                navRender = Mustache.render(`<!--nav_user-->`, info);
            else navRender = `<!--nav_nouser-->`;
            
            $('#sidebar').remove();
            $('body').append(navRender);
            
            LcatDB.Platform.handleOnline(true);
            LcatDB.Platform.initNavigation();
            
            LcatDB.Sidebar.init();
        });
    }
};




