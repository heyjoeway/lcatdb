import AppStorage from "./AppStorage";
import UserInfo from "./UserInfo";

import OfflineEventReading from "./OfflineEventReading";
import Utils from "./Utils";

class OfflineEventQueue {
    static init(name) {
        OfflineEventQueue.initialized = true;

        OfflineEventQueue.events = [];
        OfflineEventQueue.updateCallbacks = new Utils.CallbackChannel();
        OfflineEventQueue.loadEvents();
    }

    static autoSubmit() {
        OfflineEventQueue.events.forEach((event) => {
            OfflineEventQueue.submitEvent(event);
        });
    }

    static submitEvent(event, manual) {
        if (event.status == 'success')
            return OfflineEventQueue.removeEvent(event);

        if (!event.autoSubmit && !manual) return;
    
        if ((event.status == 'pending') || manual) {
            event.submit(result => {
                if (result.success) 
                    return OfflineEventQueue.removeEvent(event);
                OfflineEventQueue.saveEvents();
            });
        }

        OfflineEventQueue.updateCallbacks.run('submit');
    }

    static submitEventId(id, manual) {
        OfflineEventQueue.submitEvent(OfflineEventQueue.getEventById(id), manual);
    }

    static removeEvent(event) {
        OfflineEventQueue.removeEventId(event.id);
    }

    static getEventIndexById(id) {
        let indexFinal = -1;
        OfflineEventQueue.events.some((event, i) => {
            if (event.id == id) {
                indexFinal = i;
                return true;
            }
        });
        return indexFinal;
    }

    static getEventById(id) {
        let eventFinal;
        OfflineEventQueue.events.some(event => {
            if (event.id == id) {
                eventFinal = event;
                return true;
            }
        });
        return eventFinal;
    }

    static removeEventId(id) {
        OfflineEventQueue.removeEventIndex(OfflineEventQueue.getEventIndexById(id));
    }
    
    static removeEventIndex(index) {
        if (index <= -1) return;
        if (typeof index == 'undefined') return;
        OfflineEventQueue.events.splice(index, 1);
        OfflineEventQueue.saveEvents();
    }
    
    static clearEvents() {
        OfflineEventQueue.events = [];
        OfflineEventQueue.saveEvents();
    }

    static addEvent(event) {
        OfflineEventQueue.events.push(event);
        OfflineEventQueue.saveEvents();        
    }

    static toArray() {
        let eventsArray = [];
        OfflineEventQueue.events.forEach((event) => {
            eventsArray.push(event.toObj());
        });
        return eventsArray;
    }

    static saveEvents() {
        let path = `offlineEvents.default`;
        AppStorage.put(path, OfflineEventQueue.toArray(), UserInfo.currentUserId);
        OfflineEventQueue.updateCallbacks.run('save');
    }

    static loadEvents() {
        let path = `offlineEvents.default`;
        let eventsArray = AppStorage.get(path, UserInfo.currentUserId) || [];

        OfflineEventQueue.events = [];        
        eventsArray.forEach(eventData => {
            OfflineEventQueue.events.push(new OfflineEventReading(eventData)); // TODO
        });
        OfflineEventQueue.updateCallbacks.run('load');
    }
}

export default OfflineEventQueue;