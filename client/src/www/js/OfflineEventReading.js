const fs = require('fs'); // Browserify transform

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
            LcatDB.InputBlock.finish();
            if (callback) callback({
                "success": success
            });
        }

        if ((this.status == "success") && !force) return callback(true);

        if (!navigator.onLine) return callback(false);

        LcatDB.InputBlock.start();

        let xhr = new XMLHttpRequest();

        $.ajax({
            url: this.getUrl(),
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
        
                finish(false);
                this.fail();
            }
        });
    }

    infoHtml() {
        let renderData = {
            cid: this.data.cid,
            queueId: this.id,
            reading: {
                values: {}
            }
        };

        this.data.formData.forEach(field => {
            let path = field.name.replace(/\[/g, '.').replace(/\]/g, '');
            LcatDB.Utils.setPropertyByPath(
                renderData.reading, path, field.value
            );
        });

        let valuesArr = Object.keys(renderData.reading.values).map(
            key => renderData.reading.values[key]
        );
        renderData.reading.values = valuesArr;

        let userInfo = LcatDB.userInfo.info();

        renderData.reading.values.forEach(value => {
            value.html = Mustache.render(
                userInfo.sensorTypes[value.type].outputTemplate,
                { value: value }
            );
        });

        return Mustache.render(fs.readFileSync(
            __dirname + "/templates/offlineEventReading.mustache"
        ).toString(), renderData);
    }
};