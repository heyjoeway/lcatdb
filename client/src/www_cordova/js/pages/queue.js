LcatDB.Pages.classes.queue = class extends LcatDB.Page {
    init() {
        LcatDB.Navbar.update();
        this.updateList();
        $('#queue_submit').click(function() {
            LcatDB.App.offlineEventQueue.autoSubmit();
        });
    
        LcatDB.App.offlineEventQueue.addUpdateCallback(
            () => this.updateList()
        );
    }
    
    updateList() {
        // $('#queue_submit').attr('disabled', 'true');
        $.get('./templates/queueList.mustache', function(template, status) {
            if (status != 'success') return;
            
            $('#queue_list').html(
                Mustache.render(template, {
                    "queueList": LcatDB.App.offlineEventQueue.toArray()
                })
            );
            if (navigator.onLine)
                $('#queue_submit').removeAttr('disabled');
            
            LcatDB.UnitSystem.change();
    
            $('.event-submit').off('click').click(function() {
                let eventId = parseInt($(this).data('eventid'));
                offlineEventQueue.submitEventId(eventId, true);
            });
    
            $('.event-remove').off('click').click(function() {
                let eventId = parseInt($(this).data('eventid'));
                offlineEventQueue.removeEventId(eventId);
            });
        });
    }
};
