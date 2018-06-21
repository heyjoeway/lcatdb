LcatDB.Pages = class {
	static init() {
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

		$('.selectpicker').selectpicker();
	}

	static navigate(url, skipHistory) {
		new LcatDB.Utils.Chain(function() {
			$("#content").css({
				opacity: 0,
				"pointer-events": "none"
			});
			this.pause();

			// Give time for css anim
			setTimeout(() => this.next(), 200);

			$.get(url, data => {
				this.html = $("<div></div>").html(data);
				window.test = this.html;
				this.next();
			}, "html");
		}, function() {
			$("html").scrollTop(0);

			let $html = $(this.html);

			if (LcatDB.Pages.current)
				LcatDB.Pages.current.deinit();
			
			let title = $html.find("title").html();

			if (!skipHistory) history.pushState({}, title, url);
			document.title = title;

			$("#content").html($html.find("#content").html());

			$(`meta[name='app:page']`).prop("content",
				$html.find(`meta[name='app:page']`).prop("content")
			);

			$(`meta[name='app:mustLogin']`).prop("content",
				$html.find(`meta[name='app:mustLogin']`).prop("content")
			);

			$("#content").css({
				opacity: 1,
				"pointer-events": "unset"
			});

			LcatDB.Pages.initPage();
		})
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
