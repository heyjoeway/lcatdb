LcatDB.QueryMap = class {
    constructor(obj) {
        this.selector = obj.selector;
        this.$element = $(`#${this.selector}`);

        this.markers = [];

        this.initMap();

        if (obj.buoy)
            this.initBuoy();

        if (obj.useElementData) {
            this._ensureDefaultQuery();

            let configuration = this.$element.data('configuration');
            if (typeof configuration != "undefined")
            this.queries[0].filter.configuration = configuration;
            
            let id = this.$element.data('reading');
            if (typeof id != "undefined")
                this.queries[0].filter['_id'] = id;

            let buoy = this.$element.data('buoy');
            if (typeof buoy != "undefined")
                this.initBuoy();
        }
       
        if (obj.timePicker)
            this.addTimePicker(obj.timePicker, true);

        if (obj.userPicker)
            this.addUserPicker(obj.userPicker, true);

        this.setQueries(obj.queries);
    }

    setQueries(queries) {
        this.queries = queries || (this.queries || []);
        this.getData();
    }

    initMap() {
        this.map = L.map(this.selector);
        this.map.on('load', () => {
            setInterval(() => {
                this.map.invalidateSize();
            }, 1000);
        });
        this.map.setView(
            [44.57670853058025, -73.32539651979982], // loc
            11 // zoom
        );

        let mapConfig = LcatDB.MapsCommon.getMapConfig();
        let layer = L.tileLayer(mapConfig.url, mapConfig.options);
        layer.addTo(this.map);
    }

    initBuoy() {
        let marker = L.marker([
            44.60317,
            -73.39378
        ], {
            icon: L.icon({
                iconUrl: './img/map/markerBlack.png',
                iconAnchor: [12, 41],
                shadowUrl: './img/map/markerShadow.png',
                popupAnchor: [0, -41]
            })
        }).addTo(this.map);

        marker.bindPopup(`
            <a  href="https://leibensperger.github.io/buoy.html"
                onclick="event.preventDefault();window.open(this.href,'_system')">
                For information on the SUNY Plattsburgh Lake Champlain Data Buoy, click here.
            </a>
        `, {
            minWidth: 200,
            maxHeight: 180
        });
    }

    getData() {
        this.data = [];
        let queriesLeft = this.queries.length;

        this.queries.forEach((query, arr, i) => {
            $.post(`${LcatDB.serverUrl}/api/readings`, query, (dataSet, textStatus) => {
                if (textStatus == 'success') {
                    this.data.push(dataSet);
                    queriesLeft--;
                    if (queriesLeft == 0)
                        this.updateMap();
                }
            });
        });

        if (queriesLeft == 0)
            this.updateMap();
    }

    updateMap() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        let markerImageIndex = 0;

        let dataEmpty = true;

        this.data.forEach((dataSet) => {
            dataSet.forEach((reading) => {
                let marker = L.marker([
                    reading.location.lat,
                    reading.location.long
                ], {
                        icon: L.icon({
                            iconUrl: LcatDB.QueryMap.getMapMarkerImages()[markerImageIndex],
                            iconAnchor: [12, 41],
                            shadowUrl: './img/map/markerShadow.png',
                            popupAnchor: [0, -41]
                        })
                    }).addTo(this.map);

                marker.bindPopup(`
                    <iframe class="map-marker-iframe"
                        src="${LcatDB.serverUrl}/readings/${reading['_id']}?marker=true">
                    </iframe>
                `, {
                        "minWidth": 200,
                        "maxHeight": 180
                    });

                this.markers.push(marker);

                dataEmpty = false;
            });
            markerImageIndex = (markerImageIndex + 1) % LcatDB.QueryMap.getMapMarkerImages().length;
        });

        if (dataEmpty) return;

        let markerGroup = new L.featureGroup(this.markers);
        this.map.fitBounds(markerGroup.getBounds());
    }
    
    _ensureDefaultQuery() {
        if (typeof this.queries == "undefined") this.queries = [];

        if (typeof this.queries[0] != "undefined") return;
        
        this.queries.push({
            "fields": {
                "location.lat": 1,
                "location.long": 1
            },
            "filter": {},
            "sort": [
                ["_id", -1]
            ]
        });
    }

    _onTimePickerChange(skipGetData) {
        this._ensureDefaultQuery();

        let timeAgo = this.$timePicker.val();
        let date = new Date();
        date.setSeconds(date.getSeconds() - timeAgo);
        let timeMin = date.getTime();
    
        this.queries[0].filter.timeCreated = {
            '$gte': timeMin
        };
        
        if (!(skipGetData == true)) // COMPARING TO TRUE TO TEST FOR TYPE IM NOT CRAZY
            this.getData();
    }

    addTimePicker(selector, skipGetData) {
        this.$timePicker = $(selector);
        if (this.$timePicker.length == 0) return;

        this._onTimePickerChange(skipGetData);

        this.$timePicker.change(this._onTimePickerChange.bind(this));
    }

    _onUserPickerChange(skipGetData) {
        this._ensureDefaultQuery();

        let creator = this.$userPicker.val();

        if (typeof creator == "undefined" || creator == 'all')
            delete this.queries[0].filter.creator;
        else if (creator == "me") 
            this.queries[0].filter.creator = offlineInfo.info().user["_id"];
        else 
            this.queries[0].filter.creator = creator;
    
        if (!(skipGetData == true)) // COMPARING TO TRUE TO TEST FOR TYPE IM NOT CRAZY
            this.getData();
    }

    addUserPicker(selector, skipGetData) {
        this.$userPicker = $(selector);
        if (this.$userPicker.length == 0) return;

        this._onUserPickerChange(skipGetData);

        this.$userPicker.change(this._onUserPickerChange.bind(this));
    }

    static getMapMarkerImages() { return [
        './img/map/markerRed.png',
        './img/map/markerYellow.png',
        './img/map/markerBlue.png',
        './img/map/markerGreen.png',
        './img/map/markerPurple.png',
        './img/map/markerOrange.png',
        './img/map/markerCyan.png',
        './img/map/markerBrown.png',
        './img/map/markerWhite.png',
        './img/map/markerGrey.png',
        './img/map/markerBlack.png'
    ] }
};