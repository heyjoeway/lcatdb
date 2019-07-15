import OfflineEvent from "./OfflineEvent";
import InputBlock from "./InputBlock";

class OfflineEventPost extends OfflineEvent {
    get type() { return "OfflineEventPost"; } 
    // obj.data = {
    //     "formUrl": "form url",
    //     "formData": "form data"
    // }

    submit(callback, force) {
        function finish(success) {
            if (callback) callback({
                "success": success
            });
            
            InputBlock.finish();
        }

        if ((this.status == "success") && !force) return callback(true);

        if (!navigator.onLine) return callback(false);

        InputBlock.start();

        let xhr = new XMLHttpRequest();

        $.ajax({
            url: this.data.formUrl,
            data: this.data.formData,
            method: 'POST',
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
`<pre><code>
    ${JSON.stringify(this.data, null, 2)}
</pre></code>`
    ) }
}

export default OfflineEventPost;