const fs = require('fs'); // Browserify transform

LcatDB.Pages = class {
	static init() {
		LcatDB.Pages.currentUrl = location.href;

		LcatDB.Pages.initPage();

		window.onpopstate = event =>
			LcatDB.Pages.navigate(location.href, true);
	}

	static initPage() {
		let className = $('meta[name="app:page"]').prop("content");
		let classRef = LcatDB.Pages.classes[className];

		if (typeof classRef != "undefined")
			LcatDB.Pages.current = new classRef();

		LcatDB.UnitSystem.init();
		LcatDB.Platform.init();
		LcatDB.MapsCommon.init();
		LcatDB.ModalsCommon.init();
        LcatDB.App.initElements();

		$('.selectpicker').selectpicker();
	}

	static reload() {
		LcatDB.Pages.navigate(LcatDB.Pages.currentUrl, true);
	}

	static fadeOutContent(callback) {
		$("#content").css({
			opacity: 0,
			"pointer-events": "none"
		});

		if (callback) setTimeout(callback, 200);
	}

	static fadeInContent() {
		$("#content").css({
			opacity: 1,
			"pointer-events": "unset"
		});
	}

	static showSpinner() {
        $('#loading-content').removeClass('hide');
        setTimeout(function() {
            $('#loading-content').removeClass('disabled');
        }, 10);
	}

	static hideSpinner() {
        $('#loading-content').addClass('disabled');
        setTimeout(function() {
            $('#loading-content').addClass('hide');
        }, 250);
	}

	static populateContent(htmlString, url, skipHistory, replaceHistory) {
		LcatDB.Platform.initiOSApp();

		$("html").scrollTop(0);

		let $html = $($("<div></div>").html(htmlString));

		if (LcatDB.Pages.current)
			LcatDB.Pages.current.deinit();
		
		let title = $html.find("title").html();

		if (!LcatDB.Platform.inApp() || !LcatDB.Platform.isiOS()) {
			if (replaceHistory) history.replaceState({}, title,
				LcatDB.Platform.fixUrlHistoryPushState(url)
			);
			else if (!skipHistory) history.pushState({}, title,
				LcatDB.Platform.fixUrlHistoryPushState(url)
			);
		}

		LcatDB.Pages.currentUrl = url;

		document.title = title;

		$("#content").html($html.find("#content").html());

		$(`meta[name='app:page']`).prop("content",
			$html.find(`meta[name='app:page']`).prop("content")
		);

		let refreshNav = false;
		['mustLogin', 'noUser'].forEach(x => {
			let metaPrev = $(`meta[name='app:${x}']`).prop("content") || "false";
			let metaNew = $html.find(`meta[name='app:${x}']`).prop("content") || "false";

			refreshNav = refreshNav || (metaPrev != metaNew);
			$(`meta[name='app:${x}']`).prop("content", metaNew);
		});

		if (refreshNav) LcatDB.Sidebar.update();

		LcatDB.Pages.initPage();
		LcatDB.Pages.fadeInContent();
		LcatDB.Pages.hideSpinner();
	}

	static navigate(url, skipHistory, replaceHistory) {
		new LcatDB.Utils.Chain(function() {
			LcatDB.Platform.resolveAppUrl(url, urlRes => this.next(urlRes));
		}, function(urlResolution) {
			url = urlResolution.url;

			// If can't navigate, then url is remote. Open externally
			if (!urlResolution.canNavigate)
				return window.open(url, '_system');
			
			let isWebsite = LcatDB.Platform.isWebsite;
			let inApp = LcatDB.Platform.inApp(); 
			let isLocal = urlResolution.isLocal;

			// Remote URL cannot GET from local files
			if (isWebsite && inApp && isLocal)
				return window.open(url);

			// Give time for css anim
			this.pause();
			LcatDB.Pages.fadeOutContent(() => this.next());

			LcatDB.Pages.showSpinner();

			// Load data
			// xhr is used to capture final url in case of redirect
			this.xhr = new XMLHttpRequest();

			$.ajax({
				url: url,
				method: 'GET',
				dataType: 'html',
				xhr: () => this.xhr,
				success: data => {
					console.log("success");
					this.htmlString = data;
					this.next();	
				},
				error: () => {
					console.log("error");
					this.htmlString = fs.readFileSync(
						__dirname + "/templates/error.html"
					).toString();
					this.next();
				}
			});
		}, function() {
			LcatDB.Pages.populateContent(
				this.htmlString,
				this.xhr.responseURL || url,
				skipHistory,
				replaceHistory
			)
		});
	}
};

LcatDB.Pages.classes = {};

LcatDB.Page = class {
	constructor() { this.init(); }
	init() { }
	deinit() { }
};

require("./pages/configurationAddSensor.js");
require("./pages/configurationAddSensorModal.js");
require("./pages/configurationRemoveSensorModal.js");
require("./pages/configurationTutorial.js");
require("./pages/dashboard.js");
require("./pages/home.js");
require("./pages/login.js");
require("./pages/loginModal.js");
require("./pages/newReading.js");
require("./pages/quickJoin.js");
require("./pages/sensorNewModal.js");
require("./pages/visualize.js");
require("./pages/about.js");
require("./pages/queue.js");

LcatDB.PageForm = class extends LcatDB.Page {
    init() {
        $(document).on('submit', 'form', function(e) {
            e.preventDefault();
            LcatDB.Utils.submitFormAjax($(this));
        });
    }

    deinit() { $(document).off('submit', 'form'); }
};

LcatDB.Pages.classes.register			= LcatDB.PageForm;
LcatDB.Pages.classes.forgot				= LcatDB.PageForm;
LcatDB.Pages.classes.forgotReq			= LcatDB.PageForm;
LcatDB.Pages.classes.userEdit			= LcatDB.PageForm;
LcatDB.Pages.classes.configurationEdit 	= LcatDB.PageForm;
LcatDB.Pages.classes.sensorEdit			= LcatDB.PageForm;
LcatDB.Pages.classes.sensorNew			= LcatDB.PageForm;