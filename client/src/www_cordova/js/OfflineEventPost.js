LcatDB.App.OfflineEventPost = class extends LcatDB.App.OfflineEvent {
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
                this.response = {
                    data: data,
                    status: status
                };
                
                this.status = "success";
                if (status != "success") {
                    this.fail();
                    return finish(false);
                }
                
                finish(true);
            }
        ).fail(data => {
            if (data.responseJSON)
                this.response = { data: data.responseJSON };

            this.fail();
            finish(false);
        });
    }
};