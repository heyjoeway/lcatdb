require('./polyfill.js');

window.$ = require("jquery");
window.jQuery = $;

require('jquery-backstretch');
require('form-serializer');
require('jquery-validation');
require('iframe-resizer');
require('jquery-unitnorm');
require("jquery-spoiler")($);
require('jquery-deserialize');

window.MobileDetect = require("mobile-detect");

require('bootstrap');
require('bootstrap-notify');
require('bootstrap-show-password');
require('bootstrap-datetimepicker-npm');
require("bootstrap-select");

window.Mustache = require("mustache");
window.vis = require("vis");
window.L = require('leaflet');
require('leaflet.markercluster');

require("./lib/L.TileLayer.PouchDBCached.js");
require("./lib/modernizr-custom.js");
window.PouchDB = require("./lib/pouchdb-5.4.5.min.js");

import App from "./App";

$('document').ready(App.init);