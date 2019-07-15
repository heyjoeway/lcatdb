import AppStorage from "../AppStorage";
import AppNavigator from "../AppNavigator";
import InputBlock from "../InputBlock";
import Utils from "../Utils";
import Page from "../Page";
import Platform from "../Platform";

export default class extends Page {
    genPassword() {
        let length = 8;
        
        let symbols = "!@#$%^&";
        let letters = "qwertyuiopasdfghjklzxcvbnm";

        let password = Utils.randomString(length, letters).split("");

        let symbolsInserted = 0;
        while (symbolsInserted < 2) {
            let i = Math.floor(length * Math.random());
            let symbol = symbols[Math.floor(symbols.length * Math.random())];
            
            if (symbols.includes(password[i])) continue;

            password[i] = symbol;
            symbolsInserted++;
        }

        let numbersInserted = 0;
        while (numbersInserted < 2) {
            let i = Math.floor(length * Math.random());
            let number = Math.floor(Math.random() * 10);

            if (!isNaN(password[i])) continue;

            password[i] = number;
            numbersInserted++;
        }

        return password.join('');
    }

    genUsername() {
        return `anon${Utils.randomString(6, "1234567890")}`;
    }

    initExists() {
        $("#usernameExists").val(AppStorage.get('anon.username'));
        $("#passwordExists").val(AppStorage.get('anon.password'));
        $('#exists').show();

        $('#login').click(e => {
            e.preventDefault();

            InputBlock.start();

            $.post(`${Platform.serverUrl}/loginDo`, {
                "username": AppStorage.get('anon.username'),
                "password": AppStorage.get('anon.password'),
                "infoOnly": true
            }, (data, status) => {
                InputBlock.finish();
                if (data.success) AppNavigator.go("./dashboard.html");
                else {
                    ["forgotSent", "invalid", "reset"].forEach(
                        key => $(`#${key}`).hide()
                    );

                    $(`#${data.errorName}`).show();
                }
            }).fail(() => {
                $(`#server`).show();
                InputBlock.finish();
            });
        });
    }

    initNotExists() {
        $('#notExists').show();

        $("#username").val(this.genUsername());
        
        let password = this.genPassword();
        $("#password").val(password);
        $("#passwordRetype").val(password);

        $("#register").click(() => {
            AppStorage.put('anon', {
                username: $("#username").val(),
                password: $("#password").val()
            });

            AppNavigator.submitFormAjax($('#form'));
        });
    }

    init() {
        if (AppStorage.get('anon.username')) this.initExists();
        else this.initNotExists();
    }
};