import AppStorage from "../AppStorage";
import UserInfo from "../UserInfo";
import AppNavigator from "../AppNavigator";
import Page from "../Page";

export default class extends Page {
    onDeviceReady() {
        let navUrl = "./home.html";
        if (AppStorage.get("userInfo"))
            navUrl = './dashboard.html';

        AppNavigator.go(navUrl, true, true);
    }

    init() {
        UserInfo.get(gotNewInfo => {
            if (window.cordova) this.onDeviceReady();
            else document.addEventListener(
                'deviceready', () => this.onDeviceReady(), false
            );
        }, true);
    }
};