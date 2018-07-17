LcatDB.OfflineEventQueue = class {
    constructor(name) {
        this.events = [];
        this.name = name || 'default';
        this.updateCallbacks = new LcatDB.Utils.CallbackChannel();
        this.loadEvents();
    }

    autoSubmit() {
        this.events.forEach((event) => {
            this.submitEvent(event);
        });
    }

    submitEvent(event, manual) {
        if (event.status == 'success')
            return this.removeEvent(event);

        if (!event.autoSubmit && !manual) return;
    
        if ((event.status == 'pending') || manual) {
            event.submit(result => {
                if (result.success) 
                    return this.removeEvent(event);
                this.saveEvents();
            });
        }

        this.updateCallbacks.run('submit');
    }

    submitEventId(id, manual) {
        this.submitEvent(this.getEventById(id), manual);
    }

    removeEvent(event) {
        this.removeEventIndex(this.events.indexOf(event));
    }

    getEventIndexById(id) {
        let indexFinal = -1;
        this.events.some((event, i) => {
            if (event.id == id) {
                indexFinal = i;
                return true;
            }
        });
        return indexFinal;
    }

    getEventById(id) {
        let eventFinal;
        this.events.some(event => {
            if (event.id == id) {
                eventFinal = event;
                return true;
            }
        });
        return eventFinal;
    }

    removeEventId(id) {
        this.removeEventIndex(this.getEventIndexById(id));
    }
    
    removeEventIndex(index) {
        if (index <= -1) return;
        if (typeof index == 'undefined') return;
        this.events.splice(index, 1);
        this.saveEvents();
    }
    
    clearEvents() {
        this.events = [];
        this.saveEvents();
    }

    addEvent(event) {
        this.events.push(event);
        this.saveEvents();        
    }

    toArray() {
        let eventsArray = [];
        this.events.forEach((event) => {
            eventsArray.push(event.toObj());
        });
        return eventsArray;
    }

    saveEvents() {
        let key = `offlineEvents.${this.name}`;
        localStorage[key] = JSON.stringify(this.toArray());
        this.updateCallbacks.run('save');
    }

    loadEvents() {
        let key = `offlineEvents.${this.name}`;
        let eventsString = localStorage[key];

        if ((typeof eventsString == 'undefined') || (eventsString == ''))
            return;

        let eventsArray = JSON.parse(eventsString);
        eventsArray.forEach((eventData) => {
            this.events.push(new LcatDB.OfflineEventReading(eventData)); // TODO
        });
        this.updateCallbacks.run('load');
    }
};