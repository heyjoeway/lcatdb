LcatDB.Pages.classes.quickJoin = class extends LcatDB.Page {
    genPassword() {
        let length = 8;
        
        let symbols = "!@#$%^&";
        let letters = "qwertyuiopasdfghjklzxcvbnm";

        let password = LcatDB.Utils.randomString(length, letters).split("");

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
        return `anon${LcatDB.Utils.randomString(6, "1234567890")}`;
    }

    initExists() {
        $("#usernameExists").val(LcatDB.LocalStorage.get('anon.username'));
        $("#passwordExists").val(LcatDB.LocalStorage.get('anon.password'));
        $('#exists').show();

        $('#login').click(e => {
            e.preventDefault();

            LcatDB.InputBlock.start();

            $.post(`${LcatDB.serverUrl}/loginDo`, {
                "username": LcatDB.LocalStorage.get('anon.username'),
                "password": LcatDB.LocalStorage.get('anon.password'),
                "infoOnly": true
            }, (data, status) => {
                LcatDB.InputBlock.finish();
                if (data.success) LcatDB.Pages.navigate("./dashboard.html");
                else {
                    ["forgotSent", "invalid", "reset"].forEach(
                        key => $(`#${key}`).hide()
                    );

                    $(`#${data.errorName}`).show();
                }
            }).fail(() => {
                $(`#server`).show();
                LcatDB.InputBlock.finish();
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
            LcatDB.LocalStorage.put('anon', {
                username: $("#username").val(),
                password: $("#password").val()
            });

            LcatDB.Utils.submitFormAjax($('#form'));
        });
    }

    init() {
        if (LcatDB.LocalStorage.get('anon.username')) this.initExists();
        else this.initNotExists();
    }
};