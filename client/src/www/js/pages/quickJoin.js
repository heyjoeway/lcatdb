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
            $("#form").submit();
        });
    }

    init() {
        if (localStorage['anon.username']) this.initExists();
        else this.initNotExists();
    }
};