const fs = require('fs'); // Browserify transform

import Platform from "../Platform";
import OfflineEventQueue from "../OfflineEventQueue";
import UnitSystem from "../UnitSystem";
import Page from "../Page";
import AppNavigator from "../AppNavigator";

export default class extends Page {
    init() {
        this.updateList();
        $('#queue_submit').click(() =>
            OfflineEventQueue.autoSubmit()
        );
    
        this.queueCallback = OfflineEventQueue.updateCallbacks.add(
            () => this.updateList()
        );
    }

    deinit() {
        OfflineEventQueue.updateCallbacks.remove(this.queueCallback);
    }
    
    updateList() {
        let template = fs.readFileSync(
            __dirname + "/templates/queueList.mustache"
        ).toString();

        $('#queue_list').html(
            Mustache.render(template, {
                "queueList": OfflineEventQueue.toArray()
            })
        );

        Platform.handleOnline(true);
        UnitSystem.change();
        AppNavigator.updateLinks();
        $('.event-submit').off('click').click(function() {
            let eventId = parseInt($(this).data('eventid'));
            OfflineEventQueue.submitEventId(eventId, true);
        });

        $('.event-remove').off('click').click(function() {
            let eventId = parseInt($(this).data('eventid'));
            OfflineEventQueue.removeEventId(eventId);
        });
    }
};
