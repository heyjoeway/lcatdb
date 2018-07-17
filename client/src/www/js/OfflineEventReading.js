LcatDB.OfflineEventReading = class extends LcatDB.OfflineEvent {
    constructor(obj) {
        obj.type = "OfflineEventReading";
        super(obj);

        // obj.data = {
        //     "cid": "configuration id",
        //     "formData": "form data"
        // }
    }

    getUrl() { return (
        `${LcatDB.serverUrl}/configurations/${this.data.cid}/readingDo`
    ) }

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

        let xhr = new XMLHttpRequest();

        $.ajax({
            url: this.getUrl(),
            data: this.data.formData,
            method: 'POST',
            dataType: 'html',
            xhr: () => xhr,
            success: (data, status) => {
                this.response = {
                    data: data,
                    status: status,
                    responseURL: xhr.responseURL
                };
                
                if (status != "success") {
                    this.fail();
                    return finish(false);
                }
                
                this.status = "success";
                finish(true);
            },
            error: data => {
                this.response = { status: data.status };

                try {
                    this.response.data = JSON.parse(data.responseText);
                } catch(e) { }
        
                this.fail();
                finish(false);
            }
        });
    }

    infoHtml() { return (
        `<button class="btn btn-link"
            onclick="LcatDB.Pages.navigate('/newReading.html?editqueue=${this.id}')">
            Edit Reading
        </button>`
    ) }
};