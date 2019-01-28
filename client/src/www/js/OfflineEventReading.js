const fs = require('fs'); // Browserify transform

import UserInfo from './UserInfo';
import InputBlock from './InputBlock';
import Utils from './Utils';
import Platform from './Platform';

import OfflineEvent from './OfflineEvent';

class OfflineEventReading extends OfflineEvent {
    get type() { return "OfflineEventReading"; }

    // obj.data = {
    //     "cid": "configuration id",
    //     "formData": "form data"
    // }

    getUrl() { return (
        `${Platform.serverUrl}/configurations/${this.data.cid}/readingDo`
    ) }

    submit(callback, force) {
        function finish(success) {
            InputBlock.finish();
            if (callback) callback({
                "success": success
            });
        }

        if ((this.status == "success") && !force) return callback(true);

        if (!navigator.onLine) return callback(false);

        InputBlock.start();

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
            // replacements convert a string like this:
            // values[0][foo][bar]
            // to
            // values.0.foo.bar
            let path = field.name.replace(/\[/g, '.').replace(/\]/g, '');
            Utils.setPropertyByPath(
                renderData.reading,
                path,
                field.value
            );
        });

        // Convert object with numbered keys to array
        renderData.reading.values = Object.keys(renderData.reading.values).map(
            key => renderData.reading.values[key]
        );

        let sensorTypes = UserInfo.info.sensorTypes;

        renderData.reading.values.forEach((value, i) => {
            value.index = i;
            value.display = sensorTypes[value.type].display;
            value.display.forEach(displayNode => {
                displayNode.data = Utils.getPropertyByPath(
                    value,
                    displayNode.path
                );
            });
        });

        return Mustache.render(fs.readFileSync(
            __dirname + "/templates/offlineEventReading.mustache"
        ).toString(), renderData);
    }
}

export default OfflineEventReading;