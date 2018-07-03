LcatDB.ModalsCommon = class {
    static init() {
        LcatDB.ModalsCommon.modalsData.forEach(data => {
            $(data.selector).off('click').click(function(e) {
                e.preventDefault();            
                new LcatDB.Modal(
                    data.title,
                    data.url(this),
                    data.callback
                );
            });
        });
    }
};

LcatDB.ModalsCommon.modalsData = [{
    selector: '#sensor-new',
    title: 'Add New Sensor',
    url: () => {
        let cid = $('#configuration').text();        
        return `/sensors/new?configuration=${cid}&modal=true`
    },
    callback: () => LcatDB.Pages.reload()
}, {
    selector: '#sensor-existing',
    title: 'Add Existing Sensor',
    url: () => {
        let cid = $('#configuration').text();
        return `/configurations/${cid}/addSensor?modal=true`
    },
    callback: () => LcatDB.Pages.reload()
}, {
    selector: '.sensor-remove',
    title: 'Remove Sensor',
    url: element => {
        let cid = $('#configuration').text();
        let sid = $(element).data('sid');
        return `/configurations/${cid}/removeSensor?modal=true&sid=${sid}`;
    },
    callback: () => LcatDB.Pages.reload()
}];
