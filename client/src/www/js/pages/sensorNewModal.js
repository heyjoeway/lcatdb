import Page from "../Page";
import Platform from "../Platform";
 
export default class extends Page {
    init() {
        $('#step-1').show();
        $('#loading').hide();

        $('.model').click(function(e) {
            e.preventDefault();

            $('#step-1').hide();
            $('#loading').show();

            let $this = $(this);

            window.parent.postMessage('modal.lock', '*');

            $.post(`${Platform.serverUrl}/sensors/newDo`,
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