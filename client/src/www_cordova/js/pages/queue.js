const fs = require('fs'); // Browserify transform

LcatDB.Pages.classes.queue = class extends LcatDB.Page {
    init() {
        this.updateList();
        $('#queue_submit').click(() =>
            LcatDB.App.offlineEventQueue.autoSubmit()
        );
    
        LcatDB.App.offlineEventQueue.addUpdateCallback(
            () => this.updateList()
        );
    }
    
    updateList() {
        let template = fs.readFileSync(
            __dirname + "/templates/queueList.mustache"
        ).toString();

        $('#queue_list').html(
            Mustache.render(template, {
                "queueList": LcatDB.App.offlineEventQueue.toArray()
            })
        );

        LcatDB.Platform.handleOnline(true);
        LcatDB.UnitSystem.change();

        $('.event-submit').off('click').click(function() {
            let eventId = parseInt($(this).data('eventid'));
            LcatDB.App.offlineEventQueue.submitEventId(eventId, true);
        });

        $('.event-remove').off('click').click(function() {
            let eventId = parseInt($(this).data('eventid'));
            LcatDB.App.offlineEventQueue.removeEventId(eventId);
        });
    }
};
