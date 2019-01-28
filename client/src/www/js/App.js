
import UserInfo from "./UserInfo";
import AppNavigator from "./AppNavigator";
import InputBlock from "./InputBlock";
import Migrate from "./Migrate";
import OfflineEventQueue from "./OfflineEventQueue";
import Sidebar from "./Sidebar";

class App {
    static initNotify() {
        $.notifyDefaults({
            allow_dismiss: true,
            newest_on_top: true,
            placement: {
                from: "bottom",
                align: "center"
            },
            delay: 5000,
            template: 
    `<div data-notify="container" class="notify alert-{0} row" role="alert">
        <div class="col-xs-10 no-pad" data-notify="message">{2}</div>
        <div class="col-xs-2 no-pad text-right">
            <button type="button"
                    aria-hidden="true"
                    class="btn btn-link"
                    data-notify="dismiss">
                OK
            </button>
        </div>
    </div>`
        });
    }

    static init() {
        App.initNotify();
        InputBlock.init();
        
        if (window.parent == window)
            Migrate.init();
        
        UserInfo.init();
    
        if (window.parent == window) {
            OfflineEventQueue.init();
            Sidebar.update();
        }
    
        AppNavigator.init();
    }
}

export default App;