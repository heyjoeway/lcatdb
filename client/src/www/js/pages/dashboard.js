import Utils from "../Utils";
import Page from "../Page";

export default class extends Page {
	init() {
	    let queryObj = Utils.urlQueryObj(window.location.href);

	    ["verifySuccess", "verifyFailure"].forEach(function(key) {
	        if (queryObj[key]) $('#' + key).show();
	    });		
	}
}