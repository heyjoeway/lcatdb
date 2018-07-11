LcatDB.Pages.classes.quickJoin = class extends LcatDB.Page {
    genPassword() {
        let length = 8;
        
        let symbols = ['!','@','#','$','%','^','&'];
        let letters = ['q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m'];

        let password = [];

        for (let i = 0; i < length; i++) {
            password[i] = letters[Math.floor(letters.length * Math.random())];
        }

        let symbolsInserted = 0;
        while (symbolsInserted < 2) {
            let i = Math.floor(password.length * Math.random());
            let symbol = symbols[Math.floor(symbols.length * Math.random())];
            
            if (symbols.includes(password[i])) continue;

            password[i] = symbol;
            symbolsInserted++;
        }

        let numbersInserted = 0;
        while (numbersInserted < 2) {
            let i = Math.floor(password.length * Math.random());
            let number = Math.floor(Math.random() * 10);

            if (!isNaN(password[i])) continue;

            password[i] = number;
            numbersInserted++;
        }

        return password.join('');
    }

    genUsername() {
        let numbers = 6;
        let username = 'anon';

        for (let i = 0; i < numbers; i++) {
            username += Math.floor(Math.random() * 10);
        }

        return username;
    }

    initExists() {
        $("#usernameExists").val(localStorage['anon.username']);
        $("#passwordExists").val(localStorage['anon.password']);
        $('#exists').show();

        $('#login').click(e => {
            e.preventDefault();

            LcatDB.InputBlock.start();

            $.post(`${LcatDB.serverUrl}/loginDo`, {
                "username": localStorage['anon.username'],
                "password": localStorage['anon.password'],
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
            localStorage['anon.username'] = $("#username").val();
            localStorage['anon.password'] = $("#password").val();

            LcatDB.InputBlock.start();

			let xhr = new XMLHttpRequest();

			$.ajax({
				url: `${LcatDB.serverUrl}/registerdo?quick=true`,
				method: 'POST',
                data: $('#form').serialize(),
				dataType: 'html',
				xhr: () => xhr,
				success: (data, status) => {
                    LcatDB.InputBlock.finish();

                    if (status != "success") return;

                    LcatDB.Pages.populateContent(data, xhr.responseURL);
                },
                failure: () => LcatDB.InputBlock.finish()
			});
        });
    }

    init() {
        if (localStorage['anon.username']) this.initExists();
        else this.initNotExists();
    }
};