const fs = require('fs'); // Browserify transform

LcatDB.Pages.classes.queue = class extends LcatDB.Page {
    init() {
        this.updateList();
        $('#queue_submit').click(() =>
            LcatDB.offlineEventQueue.autoSubmit()
        );
    
        this.queueCallback = LcatDB.offlineEventQueue.updateCallbacks.add(
            () => this.updateList()
        );
    }

    deinit() {
        LcatDB.offlineEventQueue.updateCallbacks.remove(this.queueCallback);
    }
    
    updateList() {
        let template = fs.readFileSync(
            __dirname + "/templates/queueList.mustache"
        ).toString();

        $('#queue_list').html(
            Mustache.render(template, {
                "queueList": LcatDB.offlineEventQueue.toArray()
            })
        );

        LcatDB.Platform.handleOnline(true);
        LcatDB.UnitSystem.change();

        $('.event-submit').off('click').click(function() {
            let eventId = parseInt($(this).data('eventid'));
            LcatDB.offlineEventQueue.submitEventId(eventId, true);
        });

        $('.event-remove').off('click').click(function() {
            let eventId = parseInt($(this).data('eventid'));
            LcatDB.offlineEventQueue.removeEventId(eventId);
        });
    }
};
