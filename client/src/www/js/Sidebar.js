import UserInfo from "./UserInfo";
import Platform from "./Platform";
import AppNavigator from "./AppNavigator";
import InputBlock from "./InputBlock";

class Sidebar {
    static init() {
        Sidebar.isOpen = false;
        
        $(window).click(Sidebar.hide);
        $("#sidebar_btn").off('click').click(function() {
            setTimeout(Sidebar.open, 1);
        });

        $(".logout").off('click').click(e => {
            e.preventDefault();

            InputBlock.start();
            
            $.post(`${Platform.serverUrl}/logout`, () => {
                InputBlock.finish();
                UserInfo.clear();
                AppNavigator.go('./home.html');
            });
        });
    }

    static open() {
        $("#sidebar").show();
        $("#sidebar-overlay").removeClass("hide");
        setTimeout(function() {
            $("#sidebar").addClass("sidebar_show");
            $("#sidebar-overlay").removeClass("disabled");
            Sidebar.isOpen = true;
        }, 20);
    }
      
    static hide() {
        if (!Sidebar.isOpen) return;
        Sidebar.isOpen = false;
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
        UserInfo.get(gotNewInfo => {
            let configurationId = $("#configuration-picker").val();
            let info = UserInfo.info;
            let noUser = $(`meta[name='app:noUser']`).prop("content") == "true";

            let navRender;

            if ((typeof info != "undefined") && !noUser)
                navRender = Mustache.render(`<!--nav_user-->`, info);
            else navRender = `<!--nav_nouser-->`;
            
            $('#sidebar').remove();
            $('body').append(navRender);
            
            Platform.handleOnline(true);
            AppNavigator.updateLinks();
            
            Sidebar.init();
        });
    }
};

export default Sidebar;


