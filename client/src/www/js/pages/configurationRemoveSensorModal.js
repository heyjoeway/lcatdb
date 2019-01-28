import Utils from "../Utils";
import Page from "../Page";
import Platform from "../Platform";

export default class extends Page {
    init() {
        $('#step-1').show();
        $('#loading').hide();

        $('#remove').click(function(e) {
            e.preventDefault();

            $('#step-1').hide();
            $('#loading').show();
            
            window.parent.postMessage('modal.lock', '*');

            let queryObj = Utils.urlQueryObj(location.toString());

            let configurationId = location.pathname.split('/')[2];

            $.post(`${Platform.serverUrl}/configurations/${configurationId}/removeSensorDo`,
                { "sid": queryObj.sid},
                () => window.parent.postMessage('modal.done', '*')
            );
        });
    }
};