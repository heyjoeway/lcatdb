LcatDB.Pages.classes.configurationAddSensorModal = class extends LcatDB.Page {
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

            $.post(`${LcatDB.serverUrl}/configurations/${configurationId}/addSensorDo`,
                { "sid": $this.attr('id') },
                (data, success) => window.parent.postMessage('modal.done', '*')
            );
        });
    }
};