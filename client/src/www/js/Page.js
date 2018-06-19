LcatDB.Pages = class {
	static init() {
		console.log("test");
		let className = $('meta[name="app:page"]').prop("content");
		let classRef = LcatDB.Pages.classes[className];

		if (typeof classRef == "undefined")
			return console.log("ERROR: Invalid page class name.");

		LcatDB.Pages.current = new classRef();
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
require("./pages/mapEmbed.js");
require("./pages/newReading.js");
require("./pages/quickJoin.js");
require("./pages/sensorNewModal.js");
// require("./pages/visualize.js");
