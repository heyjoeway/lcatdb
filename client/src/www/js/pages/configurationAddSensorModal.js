import Page from "../Page";
import Platform from "../Platform";

export default class extends Page {
    init() {
        $('#step-1').show();
        $('#loading').hide();

        $('.sensor').click(function(e) {
            e.preventDefault();

            $('#step-1').hide();
            $('#loading').show();

            let $this = $(this);

            window.parent.postMessage('modal.lock', '*');

            let configurationId = location.pathname.split('/')[2];

            $.post(`${Platform.serverUrl}/configurations/${configurationId}/addSensorDo`,
                { "sid": $this.attr('id') },
                (data, success) => window.parent.postMessage('modal.done', '*')
            );
        });
    }
};