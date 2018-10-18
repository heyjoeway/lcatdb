LcatDB.ModalsCommon = class {
    static init() {
        LcatDB.ModalsCommon.modalsData.forEach(data => {
            $(data.selector).off('click').click(function(e) {
                e.preventDefault();    
                data.construct(this);        
            });
        });
    }
};

LcatDB.ModalsCommon.modalsData = [{
    selector: '#sensor-new',
    construct: element => new LcatDB.Modal({
        url: `/sensors/new?configuration=${$('#configuration').text()}&modal=true`,
        title: 'Add New Sensor',
        callback: () => LcatDB.Pages.reload()
    })
}, {
    selector: '#sensor-existing',
    construct: element => new LcatDB.Modal({
        title: 'Add Existing Sensor',
        url: `/configurations/${$('#configuration').text()}/addSensor?modal=true`,
        callback: () => LcatDB.Pages.reload()
    })
}, {
    selector: '.sensor-remove',
    construct: element => new LcatDB.Modal({
        title: 'Remove Sensor',
        body: `<p>Are you sure you want to remove this sensor from this configuration? The sensor will still exist, and can be re-added at any time.</p>`,
        data: {
            cid: $('#configuration').text(),
            sid: $(element).data('sid')
        },
        callback: () => LcatDB.Pages.reload(),
        buttons: [{
            text: 'Cancel'
        }, {
            text: 'Remove Sensor',
            class: 'online_only_disable',
            type: 'danger',
            action: modal => {
                modal.hide();
                LcatDB.InputBlock.start();
                $.post(
                    `${LcatDB.serverUrl}/configurations/${modal.data.cid}/removeSensorDo`,
                    { sid: modal.data.sid },
                    (data, success) => {
                        LcatDB.InputBlock.finish();
                        modal.done();
                    }
                )
            }
        }]
    })
}];
