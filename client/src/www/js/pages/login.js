import AppNavigator from "../AppNavigator";
import InputBlock from "../InputBlock";
import Utils from "../Utils";
import Page from "../Page";
import Platform from "../Platform";

export default class extends Page {
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

        let queryObj = Utils.urlQueryObj(window.location.href);

        ["forgotSent", "invalid", "reset"].forEach(function(key) {
            if (queryObj[key]) $('#' + key).show();
        });

        $('input[type=submit]').click(e => {
            e.preventDefault();

            InputBlock.start();

            $.post(`${Platform.serverUrl}/loginDo`, {
                "username": $('input[name=username]').val(),
                "password": $('input[name=password]').val(),
                "infoOnly": true
            }, (data, status) => {
                InputBlock.finish();
                
                if (data.success) AppNavigator.go("./dashboard.html");
                else {
                    ["forgotSent", "invalid", "reset"].forEach(
                        key => $('#' + key).hide()
                    );

                    $(`#${data.errorName}`).show();
                }
            }).fail(function() {
                $(`#server`).show();
                InputBlock.finish();
            });
        });
    }

    deinit() {
        $("#content").backstretch("destroy");
        $("input[type=submit]").off("click");
    }
}