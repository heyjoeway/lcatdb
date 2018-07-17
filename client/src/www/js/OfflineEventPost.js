LcatDB.OfflineEventPost = class extends LcatDB.OfflineEvent {
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

        let xhr = new XMLHttpRequest();

        $.ajax({
            url: this.data.formUrl,
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
                if (data.responseJSON)
                    this.response = { data: data.responseJSON };
        
                this.fail();
                finish(false);
            }
        });
    }

    infoHtml() { return (
`<pre><code>
    ${JSON.stringify(this.data, null, 2)}
</pre></code>`
    ) }
};