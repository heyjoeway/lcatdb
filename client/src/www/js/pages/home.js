import Platform from "../Platform";
import Page from "../Page";

export default class extends Page {
	init() {
	    $('#home-slideshow').backstretch([
	        './img/home/bg1.jpg',
	        './img/home/bg2.jpg',
	        './img/home/bg3.jpg',
	        './img/home/bg4.jpg'
	    ], {duration: 5000, fade: 750});

	    if (Platform.isWebsite && !Platform.isiOS) $(".app-banner-google").show();
		if (Platform.isWebsite) $(".app-banner-apple").show();
		
		$("body").addClass("no-nav no-pad");
	}

	deinit() {
		$("body").removeClass("no-nav no-pad");		
	}
};