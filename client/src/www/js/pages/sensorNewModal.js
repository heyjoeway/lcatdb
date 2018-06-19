 LcatDB.Pages.classes.sensorNewModal = class extends LcatDB.Page {
    init() {
        $('.model').click(function(e) {
            e.preventDefault();

            $('#step-1').hide();
            $('#loading').show();

            let $this = $(this);

            window.parent.postMessage('modal.lock', '*');

            $.post(`${LcatDB.serverUrl}/sensors/newDo`,
                {
                    "type": $this.data('type'),
                    "model": $this.data('model'),
                    "configuration": $('#configuration').text()
                },
                () => window.parent.postMessage('modal.done', '*')
            );
        });
    }
};