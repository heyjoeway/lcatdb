LcatDB.Pages.classes.login = class extends LcatDB.Page {
    init() {
        // If in modal, session must be invalid.
        // Refresh parent to kick it back to login screen.
        window.parent.postMessage('modal.reload', '*');

        // Slideshow
        $('#content').backstretch([
            './img/home/bg1.jpg',
            './img/home/bg2.jpg',
            './img/home/bg3.jpg',
            './img/home/bg4.jpg'
        ], {duration: 5000, fade: 750});

        let queryObj = LcatDB.Utils.urlQueryObj(window.location.href);

        ["forgotSent", "invalid", "reset"].forEach(function(key) {
            if (queryObj[key]) $('#' + key).show();
        });

        $('input[type=submit]').click(e => {
            e.preventDefault();

            LcatDB.InputBlock.start();

            $.post(`${LcatDB.serverUrl}/loginDo`, {
                "username": $('input[name=username]').val(),
                "password": $('input[name=password]').val(),
                "infoOnly": true
            }, (data, status) => {
                LcatDB.InputBlock.finish();
                
                if (data.success) LcatDB.Pages.navigate("./dashboard.html");
                else {
                    ["forgotSent", "invalid", "reset"].forEach(
                        key => $('#' + key).hide()
                    );

                    $(`#${data.errorName}`).show();
                }
            }).fail(function() {
                $(`#server`).show();
                LcatDB.InputBlock.finish();
            });
        });

        // body CSS
        $("body").addClass("body-fullheight body-transparentnavbar body-darkbg");
    }

    deinit() {
        $("#content").backstretch("destroy");
        $("body").removeClass("body-fullheight body-transparentnavbar body-darkbg");
        $("input[type=submit]").off("click");
    }
}