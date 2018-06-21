LcatDB.Pages.classes.loginModal = class extends LcatDB.Page {
    postSuccess(data, status) {
        if (data.success) window.parent.postMessage('modal.done', '*');
        else {
            ["forgotSent", "invalid", "reset"].forEach(function(key) {
                $('#' + key).hide();
            });
            $(`#${data.errorName}`).show();
            $("#step-1").show();
            $("#loading").hide();
        }
    }

    postFailure() {
        $(`#server`).show();
        $("#step-1").show();
        $("#loading").hide();
    }

    init() {
        $('input[type=submit]').click(e => {
            e.preventDefault();

            $("#step-1").hide();
            $("#loading").show();

            $.post(`${LcatDB.serverUrl}/loginDo`, {
                "username": $('input[name=username]').val(),
                "password": $('input[name=password]').val(),
                "infoOnly": true
            }, this.postSuccess).fail(this.postFailure);
        });

        $("#button-quicklogin").click(() => {
            $("#step-1").hide();
            $("#loading").show();

            $.post(`${LcatDB.serverUrl}/loginDo`, {
                "username": localStorage['anon.username'],
                "password": localStorage['anon.password'],
                "infoOnly": true
            }, this.postSuccess).fail(this.postFailure);   
        });
    }
}