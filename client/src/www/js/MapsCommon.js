LcatDB.MapsCommon = class {
	static getMapConfig() { return {
	    url: '<!--map_url-->',
	    options: {
	        attribution: '<!--map_attribution-->',
	        maxZoom: 18,
	        id: '<!--map_id-->',
	        accessToken: '<!--map_token-->',
	        useCache: LcatDB.Platform.inApp(),
	        crossOrigin: true
	    }
	}};

	static init() {
	    if (document.getElementById("map-time"))
	        new LcatDB.QueryMap({
	            selector: 'map-time',
	            useElementData: true,
	            timePicker: '#map-time-picker',
	            userPicker: '#map-user-picker'
	        });
	}
};