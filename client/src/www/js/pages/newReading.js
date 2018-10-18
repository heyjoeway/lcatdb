const fs = require('fs'); // Browserify transform

LcatDB.Pages.classes.newReading = class extends LcatDB.Page {
    // Update the list of configurations trigger a configuration change
    updateConfigList(init) {
        LcatDB.userInfo.get(gotNewInfo => {
            let html = '';

            let configurationIndex = $('#configuration-picker').val() || 0;

            // Exception occurs if userinfo.info() does not exist (logged out) 
            try {
                LcatDB.userInfo.info().configurations.forEach((configuration, i) => {
                    html += `<option value="${i}">${configuration.name}</option>`;
    
                    if (init && configuration['_id'] == this.configurationId)
                        configurationIndex = i;
                });
    
                $('#configuration-picker')
                    .html(html)
                    .selectpicker('refresh')
                    .val(configurationIndex);
    
                this.changeConfig();
            } catch(e) { }
        }, true);
    }

    // Change the current configuration and render the sensors section
    changeConfig() {
        let sensorsTemplate = fs.readFileSync(
            __dirname + "/templates/newReadingSensors.mustache"
        ).toString();

        let configurationIndex = $("#configuration-picker").val();

        let data = LcatDB.userInfo.info();
        let configuration = data.configurations[configurationIndex]; 
        this.configurationId = configuration['_id'];

        configuration.sensors.sort((a, b) =>
            a["_id"].localeCompare(b["_id"])
        );

        let inputTemplate = fs.readFileSync(
            __dirname + "/templates/newReadingInput.mustache"
        ).toString();
        configuration.sensors.forEach((sensor, i) => {
            sensor.index = i;
            sensor.typeData = data.sensorTypes[sensor.type];
            sensor.html = Mustache.render(
                inputTemplate,
                { sensor: sensor }
            );
        });

        $('#configuration-sensors').html(
            Mustache.render(sensorsTemplate, {
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
        
        LcatDB.Platform.initNavigation();
        
        this.initSensorBtns();
        this.initEventForm();
  
        LcatDB.UnitSystem.change();
    }

    // Update the map's current position
    updateMap() {
        let lat = $('input[name="location[lat]"]').val() || 0;
        let long = $('input[name="location[long]"]').val() || 0;

        if ((lat == 0) && (long == 0)) {
            lat = 44.57670853058025;
            long = -73.32539651979982;
        }
        
        let pos = [lat, long];

        this.marker.setLatLng(pos);
        this.map.panTo(pos);
    }

    // Initialize the buttons that allow add/removing sensors
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

                new LcatDB.Modal({
                    title: data.title,
                    url: data.url(cid, sid),
                    callback: modal => {
                        this.updateConfigList();
                        modal.hide();
                    }
                });
            });
        });
    }

    // Get current location (mobile only to ensure accuracy)
    getLocation(auto) {
        let autoEnabled = LcatDB.LocalStorage.get('location.auto', true);
        if (auto && !autoEnabled) return;

        // Location probably not precise on desktop/laptop
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

    // Validate input and display an error message if invalid
    validateInput(suppress) {
        let $form = $('#form');
        let hasFailed = $("#form").find("input").toArray().some(input => {
            let $input = $(input);

            let isRequired = input.required;
            let isEmpty = $input.val() == "";
            let isValid = input.checkValidity();
            
            return !isValid || (isRequired && isEmpty);
        });  

        if (hasFailed && !suppress)
            $.notify({
                "message": "Please make sure all fields are properly filled out."
            }, {
                "type": "danger"
            });

        return !hasFailed;
    }

    // Add reading to queue and reload configuration to clear input
    queue() {
        if (!this.validateInput()) return;

        LcatDB.offlineEventQueue.addEvent(new LcatDB.OfflineEventReading({
            data: {
                cid: this.configurationId,
                formData: $('#form').serializeArray()
            },
            name: "Reading"
        }));

        this.changeConfig();
    }

    // Submit reading or queue if offline
    submit() {
        if (!this.validateInput()) return;

        LcatDB.InputBlock.start();
        
        let event = new LcatDB.OfflineEventReading({
            data: {
                cid: this.configurationId,
                formData: $('#form').serializeArray()
            },
            name: "Reading"
        });

        event.submit(data => {
            LcatDB.InputBlock.finish();

            if (data.success) {
                LcatDB.Pages.populateContent(
                    event.response.data,
                    event.response.responseURL
                );
            } else {
                LcatDB.offlineEventQueue.addEvent(event);
                LcatDB.Pages.navigate('./queue.html');
            }
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

    // Initialize the datetime picker on browsers without native support
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

    initSubmitBtns() {
        $("#queue").click(e => {
            e.preventDefault();
            if (!this.validateInput()) return;

            this.queue();

            $("#publish").hide();
            $("#viewqueue").show();
        });

        $("#publish").click(e => {
            e.preventDefault();
            this.submit();
        });

        $("#viewqueue").click(e => {
            e.preventDefault();
            if (!this.validateInput(true)) {
                new LcatDB.Modal({
                    title: "Warning",
                    body:
`The current reading seems to be invalid. Make sure all fields are filled out and try again.<br>
If you don't want to submit the current reading, press the button below to continue. Your other readings will remain in the queue.`,
                    callback: () => LcatDB.Pages.navigate("./queue.html"),
                    buttons: [{
                        text: "Cancel"
                    }, {
                        text: "Discard Reading and View Queue",
                        type: "warning",
                        action: modal => modal.done()
                    }]
                });
            } else {
                this.queue();
                LcatDB.Pages.navigate("./queue.html");
            }

        });
    }

    initEventForm() {
        if (typeof this.event == "undefined") return;

        $("#form").deserialize(this.event.data.formData);
        $("#configuration-picker").parent('.bootstrap-select').hide();
        $("#sensor-new").hide();
        $("#sensor-existing").hide();
        $(".sensor-remove").hide();
    }

    initEvent() {
        if (typeof this.eventId == "undefined") return;

        this.event = LcatDB.offlineEventQueue.getEventById(this.eventId);
        this.configurationId = this.event.data.cid;

        $("#publish").hide();
        $("#queue").hide();
        $("#edit").show();

        $("#edit").click(e => {
            e.preventDefault();
            if (!this.validateInput()) return;

            LcatDB.offlineEventQueue.removeEvent(this.event);

            this.queue();
            LcatDB.Pages.navigate("./queue.html");
        });
    }

    init() {
        let queryObj = LcatDB.Utils.urlQueryObj(location.href);
        this.configurationId = queryObj.configuration;
        this.eventId = queryObj.editqueue;

        this.initEvent();
        this.initConfigList();
        this.initMobile();
        this.initDatetime();
        this.initSubmitBtns();
        LcatDB.Utils.preventEnterKey();

        $('.spoiler').spoiler();

        $("input[name=timeCreated]")
            .val((new Date).getTime())
            .change();

        $("#location_auto").prop('checked', LcatDB.LocalStorage.get('location.auto', true));
        $("#location_auto").change(function() {
            LcatDB.LocalStorage.put('location.auto', $(this).prop('checked', true));
        });

        this.initMap();

        $("#button-getlocation").click(() => this.getLocation());
    }
};