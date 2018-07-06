LcatDB.Pages.classes.home = class extends LcatDB.Page {
	init() {
	    $('#home-slideshow').backstretch([
	        './img/home/bg1.jpg',
	        './img/home/bg2.jpg',
	        './img/home/bg3.jpg',
	        './img/home/bg4.jpg'
	    ], {duration: 5000, fade: 750});

	    if (LcatDB.Platform.isWebsite && !LcatDB.Platform.isiOS()) $(".appBanner-google").show();
		if (LcatDB.Platform.isWebsite) $(".appBanner-apple").show();
		
		$("body").addClass("no-nav no-pad");
	}

	deinit() {
		$("body").removeClass("no-nav no-pad");		
	}
};