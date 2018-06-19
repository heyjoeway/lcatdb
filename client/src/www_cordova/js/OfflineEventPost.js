import OfflineEvent from "./OfflineEvent.js";

class OfflineEventPost extends OfflineEvent {
    constructor(obj) {
        obj.type = "OfflineEventPost";
        super(obj);

        // obj.data = {
        //     "formUrl": "form url",
        //     "formData": "form data"
        // }
    }

    submit(callback, force) {
        function finish(success) {
            if (callback) callback({
                "success": success
            });
            
            LcatDB.InputBlock.finish();
        }

        if ((this.status == "success") && !force) return;

        if (!navigator.onLine) return;

        LcatDB.InputBlock.start();
        $.post(
            this.data.formUrl,
            this.data.formData,
            (data, status) => {
                if (status == "success") {
                    this.response = {
                        data: data,
                        status: status
                    };
                    this.status = "success";
                    finish(true);
                } else {
                    this.status = "failure";
                    this.failures++;
                    finish(false);
                }
            }
        ).fail(() => {
            this.status = "failure";
            this.failures++;
            finish(false);
        });
    }
}

export default OfflineEventPost;