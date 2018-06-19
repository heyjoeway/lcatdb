LcatDB.Pages.classes.configurationRemoveSensorModal = class extends LcatDB.Page {
    init() {
        $('#remove').click(function(e) {
            e.preventDefault();

            $('#step-1').hide();
            $('#loading').show();
            
            window.parent.postMessage('modal.lock', '*');

            let queryObj = LcatDB.Utils.urlQueryObj(location.toString());

            let configurationId = location.pathname.split('/')[2];

            $.post(`${LcatDB.serverUrl}/configurations/${configurationId}/removeSensorDo`,
                { "sid": queryObj.sid},
                (data, success) => window.parent.postMessage('modal.done', '*')
            );
        });
    }
};