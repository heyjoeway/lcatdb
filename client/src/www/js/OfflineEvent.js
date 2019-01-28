import Platform from "./Platform";
import LoginModal from "./LoginModal";

class OfflineEvent {
    get type() { return "OfflineEvent"; };
    
    constructor(obj) {
        obj = obj || {};
        this.name = obj.name || "Unknown";
        this.data = obj.data || {};
        this.timeCreated = obj.timeCreated || (new Date()).getTime();
        this.id = obj.id || this.randomId();
        this.autoSubmit = obj.autoSubmit || true;
        this.status = "pending";
        this.failures = 0;
        // this.priority = 0; // Higher priority = processes sooner TODO
        /* 
         * Available states are:
         * - hold: Event is being modified or held in some form, do not submit
         * - pending: Waiting to be submitted
         * - success: Already succeeded (event should be deleted in this case)
         * - idConflict: Event has already been processed by server (same as success)
         * - failure: Generic failure, allow user to manually retry
         * 
         * Other states can be provided and managed by subclasses
         */
    }

    toObj() { return {
        "type": this.type,
        "name": this.name,
        "data": this.data,
        "timeCreated": this.timeCreated,
        "id": this.id,
        "autoSubmit": this.autoSubmit,
        "status": this.status,
        "priority": this.priority,
        "infoHtml": this.infoHtml()
    } }

    randomId() {
        return Math.random().toString().substr(2);
    }

    submit(callback) {
        console.log("Please override this function.");
        callback({ "success": "true" });
    }

    fail() {
        this.status = "failure";
        this.failures++;

        try {
            if (this.response.data.errorName == "noUser")
                LoginModal.open();
        } catch (e) { }
    }

    infoHtml() { }
}

export default OfflineEvent;