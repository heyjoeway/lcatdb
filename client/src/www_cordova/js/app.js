LcatDB.Platform.isWebsite = false;

LcatDB.App = class {
    static init() { }
    
    static initElements() {
        $(".cordova_only_hide").show();
    }
};

require("./pages/startup.js");