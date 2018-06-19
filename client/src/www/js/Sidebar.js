LcatDB.Sidebar = class {
    static init() {
        LcatDB.Sidebar.isOpen = false;
        
        $(window).click(LcatDB.Sidebar.hide);
        $("#sidebar_btn").click(function() {
            setTimeout(LcatDB.Sidebar.open, 1);
        });
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
};




