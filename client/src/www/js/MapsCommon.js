import QueryMap from "./QueryMap";

class MapsCommon {
	static init() {
	    if (document.getElementById("map-time"))
	        new QueryMap({
	            selector: 'map-time',
	            useElementData: true,
	            timePicker: '#map-time-picker',
	            userPicker: '#map-user-picker'
	        });
	}
}

export default MapsCommon;