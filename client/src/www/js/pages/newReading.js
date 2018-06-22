const fs = require('fs'); // Browserify transform

LcatDB.Pages.classes.newReading = class extends LcatDB.Page {
    updateConfigList(init) {
        LcatDB.offlineInfo.get(gotNewInfo => {
            let html = '';

            let configurationIndex = $('#configuration-picker').val() || 0;

            LcatDB.offlineInfo.info().configurations.forEach((configuration, i) => {
                html += `<option value="${i}">${configuration.name}</option>`;

                if (init && configuration['_id'] == this.configurationId)
                    configurationIndex = i;
            });

            $('#configuration-picker')
                .html(html)
                .selectpicker('refresh')
                .val(configurationIndex);

            this.changeConfig();
        }, true);
    }

    changeConfig() {
        let template = fs.readFileSync(
            __dirname + "/templates/configurationSensors.mustache"
        ).toString();

        let configurationIndex = $("#configuration-picker").val();

        let data = LcatDB.offlineInfo.info();
        let configuration = data.configurations[configurationIndex]; 
        this.configurationId = configuration['_id'];

        configuration.sensors.forEach(function(sensor, i) {
            sensor.index = i;
            sensor.html = Mustache.render(
                data.sensorTypes[sensor.type].inputTemplate,
                sensor
            );
        });

        $('#configuration-sensors').html(
            Mustache.render(template, {
                "configuration": configuration
            })
        );
        $('#configuration-link').prop(
            'href',
            `${LcatDB.serverUrl}/configurations/${configuration['_id']}`
        );
        $('.configuration-chosen').show();
        $('.configuration-notchosen').hide();

        $('#configuration-sensors .spoiler').spoiler();
        
        LcatDB.UnitSystem.change();
        LcatDB.Platform.initNavigation();

        this.initSensorBtns();
        this.updateSubmit();
    }


    updateMap() {
        let lat = $('input[name="location[lat]"]').val();
        let long = $('input[name="location[long]"]').val();

        if ((lat == 0) && (long == 0)) {
            lat = 44.57670853058025;
            long = -73.32539651979982;
        }
        
        let pos = [lat, long];

        this.marker.setLatLng(pos);
        this.map.panTo(pos);
    }

    initSensorBtns() {
        [{
            selector: '#sensor-new',
            title: 'Add New Sensor',
            url: cid => `${LcatDB.serverUrl}/sensors/new?configuration=${cid}&modal=true`,
        }, {
            selector: '#sensor-existing',
            title: 'Add Existing Sensor',
            url: cid => `${LcatDB.serverUrl}/configurations/${cid}/addSensor?modal=true`,
        }, {
            selector: '.sensor-remove',
            title: 'Remove Sensor',
            url: (cid, sid) => `${LcatDB.serverUrl}/configurations/${cid}/removeSensor?modal=true&sid=${sid}`,
        }].forEach(data => {
            $(data.selector).off('click').click(e => {
                e.preventDefault();

                let cid = this.configurationId;
                let sid = $(e.target).data('sid');

                new LcatDB.Modal(
                    data.title,
                    data.url(cid, sid),
                    modal => {
                        this.updateConfigList();
                        modal.hide();
                    }
                );
            });
        });
    }

    getLocation(auto) {
        if (auto && (localStorage['LcatDB.location.auto'] != 'true'))
            return;

        if (!this.mobileDetect.phone()) return;

        if (!navigator.geolocation)
            return $.notify({
                "message": 'Could not retrieve location. Geolocation is not supported by this browser.'
            }, {
                "type": 'warning'
            });

        navigator.geolocation.getCurrentPosition(
            pos => { // Success
                [[
                    'input[name="location[lat]"]',
                    pos.coords.latitude
                ],[
                    'input[name="location[long]"]',
                    pos.coords.longitude
                ],[
                    'input[name="location[range]"]',
                    pos.coords.accuracy
                ],[
                    'input[name="location[alt]"]',
                    pos.coords.altitude
                ],[
                    'input[name="location[altRange]"]',
                    pos.coords.altitudeAccuracy
                ]].forEach(x => $(x[0]).val(x[1]).change());
                this.updateMap();
            },
            () => { // Failure
                $.notify({
                    "message": 'Could not retrieve location. Please allow location on your device.'
                }, {
                    "type": 'warning'
                });
            },
            { // Options
                "enableHighAccuracy": true,
                "maximumAge": 3 * 60 * 1000, // 3 minutes
                "timeout": 15 * 1000 // 15 sec (may increase)
            }
        );
    }

    queueReading() {
        if (typeof cordova == 'undefined') return;
        let formData = LcatDB.Utils.objectifyForm(
            $('form').serializeArray()
        );
    }

    updateSubmit() {
        $(document).on('submit', 'form', e => {
            e.preventDefault();
            this.submit();
        });
    };

    submit() {
        if (LcatDB.Platform.inApp()) this.submitCordova();
        else this.submitWeb();
    }

    submitWeb(failCallback) {
        function finish(success, data) {
            if (success)
                return location.href = `${LcatDB.serverUrl}/readings/${data.rid}`;

            if (failCallback) return failCallback(data);
            $.notify({
                "message": "Could not submit reading. Make sure you're online and that all of the fields are properly filled out."
            }, {
                "type": 'danger'
            });
            LcatDB.InputBlock.finish();
        }

        LcatDB.InputBlock.start();

        let formData = $('#form').serializeArray();
        // Add extra attribute to request that sends back data in JSON
        formData.push({
            "name": "infoOnly",
            "value": true
        });

        let cid = this.configurationId;

        $.post(
            `${LcatDB.serverUrl}/configurations/${cid}/readingDo`,
            formData,
            (data, status) => { finish(status == "success", data); }
        ).fail(() => { finish(false); });
    };

    validateInput() {
        let $form = $('#form');
        let hasFailed = $("#form").find("input").toArray().some(input => {
            let $input = $(input);

            let isRequired = input.required;
            let isEmpty = $input.val() == "";
            let isValid = input.checkValidity();
            
            return !isValid || (isRequired && isEmpty);
        });  

        if (hasFailed)
            $.notify({
                "message": "Please make sure all fields are properly filled out."
            }, {
                "type": "danger"
            });

        return !hasFailed;
    }

    submitCordova() {
        // iOS webkit doesn't support field validation because apple is fantastic
        // so we have to do it manually
        if (LcatDB.Platform.isiOS && !this.validateInput()) return;

        // Try to submit normally over the internet, and if that doesn't work
        // then just cache it and go to the queue
        let cid = this.configurationId;

        this.submitWeb(function(data) {
            LcatDB.offlineEventQueue.addEvent(new OfflineEventPost({
                "data": {
                    "formUrl": `${LcatDB.serverUrl}/configurations/${cid}/readingDo`,
                    "formData": $('#form').serializeArray()
                },
                "name": "Reading"
            }));
            location.href = './queue.html';
        });
    }

    initMap() {
        let pos = [
            44.57670853058025,
            -73.32539651979982
        ];

        let map = L.map('map');
        this.map = map;
        map.on('load', () => {
            setInterval(() => {
                this.map.invalidateSize();
            }, 1000);
        });
        map.setView(pos, 11);

        let mapConfig = LcatDB.MapsCommon.getMapConfig();
        let layer = L.tileLayer(mapConfig.url, mapConfig.options);
        layer.addTo(map);

        let marker = L.marker(pos, {
            draggable: true,
            autoPan: true,
            icon: L.icon({
                iconUrl: './img/map/markerRed.png',
                shadowUrl: './img/map/markerRed.png',
                iconAnchor: [12, 41],
                shadowUrl: './img/map/markerShadow.png',
                popupAnchor: [0, -41]
            })
        }).addTo(map);

        this.marker = marker;
        
        marker.on('dragend', () => {
            var pos = marker.getLatLng();
            $('input[name="location[lat]"]').val(pos.lat).change();
            $('input[name="location[long]"]').val(pos.lng).change();
            this.updateMap();
        });

        $('input[name="location[lat]"]').change(() => this.updateMap());
        $('input[name="location[long]"]').change(() => this.updateMap());

        this.getLocation(true);
    }

    initDatetime() {
        if(!Modernizr.inputtypes['datetime-local'])
            $('input[type=datetime-local]').datetimepicker({
                "showMeridian": true,
                "format": "yyyy-mm-ddThh:ii",
                "startView": 2,
                "minView": 0,
                "todayBtn": true,
                "todayHighlight": true
            });
    }

    initMobile() {
        this.mobileDetect = new MobileDetect(window.navigator.userAgent);
        
        if (this.mobileDetect.phone()) $('#location_mobile').show();
        else $('#location_desktop').show();
    }

    initConfigList() {
        this.updateConfigList(true);

        $("#configuration-picker").change(() => this.changeConfig());
    }

    init() {
        let queryObj = LcatDB.Utils.urlQueryObj(location.href);
        this.configurationId = queryObj.configuration;    

        this.initConfigList();
        this.initMobile();
        this.initDatetime();
        LcatDB.Utils.preventEnterKey();

        $('.normalize').unitnorm();
        $('.spoiler').spoiler();

        $("input[name=timeCreated]")
            .val((new Date).getTime())
            .change();

        $("#location_auto").prop('checked', localStorage['LcatDB.location.auto'] == 'true');
        $("#location_auto").change(function() {
            localStorage['LcatDB.location.auto'] = $(this).prop('checked').toString();
        });

        this.initMap();

        $("body").addClass("page-newReading");
    }
    
    deinit() {
        $("body").removeClass("page-newReading");
        $(document).off('submit', 'form');
    }
};