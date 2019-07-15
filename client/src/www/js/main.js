require('./polyfill.js');

window.$ = require("jquery");
window.jQuery = $;

require('jquery-backstretch');
require('form-serializer');
require('jquery-validation');
require('iframe-resizer');
require('jquery-unitnorm');
require("jquery-spoiler")($);
require('jquery-deserialize');

window.MobileDetect = require("mobile-detect");

require('bootstrap');
require('bootstrap-notify');
require('bootstrap-show-password');
require('bootstrap-datetimepicker-npm');
require("bootstrap-select");

window.Mustache = require("mustache");
window.vis = require("vis");
window.L = require('leaflet');
require('leaflet.markercluster');

require("./lib/L.TileLayer.PouchDBCached.js");
require("./lib/modernizr-custom.js");
window.PouchDB = require("./lib/pouchdb-5.4.5.min.js");

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

$('document').ready(App.init);