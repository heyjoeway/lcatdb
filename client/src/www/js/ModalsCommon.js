import Modal from "./Modal";
import InputBlock from "./InputBlock";
import Platform from "./Platform";
import AppNavigator from "./AppNavigator";

class ModalsCommon {
    static init() {
        ModalsCommon.modalsData.forEach(data => {
            $(data.selector).off('click').click(function(e) {
                e.preventDefault();    
                data.construct(this);        
            });
        });
    }

    static get modalsData() { return [{
        selector: '#sensor-new',
        construct: element => new Modal({
            url: `/sensors/newModal?configuration=${$('#configuration').text()}`,
            title: 'Add New Sensor',
            callback: () => AppNavigator.reload()
        })
    }, {
        selector: '#sensor-existing',
        construct: element => new Modal({
            title: 'Add Existing Sensor',
            url: `/configurations/${$('#configuration').text()}/addSensorModal`,
            callback: () => AppNavigator.reload()
        })
    }, {
        selector: '.sensor-remove',
        construct: element => new Modal({
            title: 'Remove Sensor',
            body: `<p>Are you sure you want to remove this sensor from this configuration? The sensor will still exist, and can be re-added at any time.</p>`,
            data: {
                cid: $('#configuration').text(),
                sid: $(element).data('sid')
            },
            callback: () => AppNavigator.reload(),
            buttons: [{
                text: 'Cancel'
            }, {
                text: 'Remove Sensor',
                class: 'online_only_disable',
                type: 'danger',
                action: modal => {
                    modal.hide();
                    InputBlock.start();
                    $.post(
                        `${Platform.serverUrl}/configurations/${modal.data.cid}/removeSensorDo`,
                        { sid: modal.data.sid },
                        (data, success) => {
                            InputBlock.finish();
                            modal.done();
                        }
                    )
                }
            }]
        })    
    }]; }
}

export default ModalsCommon;