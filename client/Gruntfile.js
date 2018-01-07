const fs = require('fs');

module.exports = function(grunt) {

const PACKAGE = require("./package.json");

const TITLE = "lcatᴰᴮ";
const URL = "http://localhost:3000";

// All paths should end in "/". I'm lazy.

const SRC_DIR = "./src/";
const BUILD_DIR = "./build/";
const TMP_DIR = "./tmp/";
const TEMPLATES_DIR = SRC_DIR + "templates/";

// Also, I'm adding an extra layer onto the build/src directories in case we
// ever want to build for a different platform.

const WWW_SRC = SRC_DIR + "www/";
const WWW_BUILD = BUILD_DIR + "www/";
const WWW_TMP = TMP_DIR + "www/";

const VIEWS_SRC = SRC_DIR + "views/";
const VIEWS_BUILD = BUILD_DIR + "views/";
const VIEWS_TMP = TMP_DIR + "views/";

const EMAILS_SRC = SRC_DIR + "emails/";
const EMAILS_BUILD = BUILD_DIR + "emails/";
const EMAILS_TMP = TMP_DIR + "emails/";

const CORDOVA_SRC = SRC_DIR + "www_cordova/";
const CORDOVA_BUILD = BUILD_DIR + "www_cordova/";
const CORDOVA_TMP = TMP_DIR + "www_cordova/";
const CORDOVA_FINAL = "./cordova/www";

var config = {};

config.clean = {};
config.clean.cordova = [
    "./build/www_cordova/**/*.*",
    "./tmp/www_cordova/**/*.*",
    "./cordova/www/**/*.*"
];
config.clean.www = [
    "./build/www/**/*.*",
    "./tmp/www/**/*.*"
];
config.clean.views = [
    "./build/views/**/*.*",
    "./tmp/views/**/*.*"
];
config.clean.emails = [
    "./build/emails/**/*.*",
    "./tmp/emails/**/*.*"
];

config.sass = {};
config.sass.www = {
    files: [{
        options: {
            style: "compressed",
        },
        src: WWW_SRC + "css/style.scss",
        dest: WWW_BUILD + "css/style.min.css"
    }]
};

// <!--nav--> must come before <!--nav_nouser--> and <!--nav_user-->!!!!!

let replacements = [{
    match: "<!--head-->",
    replacement: fs.readFileSync(TEMPLATES_DIR + "head.html", "utf8")
}, {
    match: "<!--nav_nouser-->",
    replacement: fs.readFileSync(TEMPLATES_DIR + "nav_nouser.html", "utf8")
}, {
    match: "<!--nav_user-->",
    replacement: fs.readFileSync(TEMPLATES_DIR + "nav_user.html", "utf8")
}, {
    match: "<!--nav_auto-->",
    replacement: fs.readFileSync(TEMPLATES_DIR + "nav_auto.html", "utf8")
}, {
    match: "<!--nav_blank-->",
    replacement: fs.readFileSync(TEMPLATES_DIR + "nav_blank.html", "utf8")
}, {
    match: "<!--footer-->",
    replacement: fs.readFileSync(TEMPLATES_DIR + "footer.html", "utf8")
}, {
    match: "<!--scripts-->",
    replacement: fs.readFileSync(TEMPLATES_DIR + "scripts.html", "utf8")
}, {
    match: "<!--script_map-->",
    replacement: fs.readFileSync(TEMPLATES_DIR + "script_map.html", "utf8")
}, {
    match: "<!--title-->",
    replacement: TITLE
}, {
    match: "<!--version-->",
    replacement: PACKAGE.version
}, {
    match: "<!--url-->",
    replacement: PACKAGE.version
}];

config.replace = {
    options: {
        patterns: replacements,
        prefix: ''
    }
};
config.replace.www = {
    files: [{
        expand: true,
        cwd: WWW_SRC + "pages",
        src: ["**/*.html", "**/*.mustache"],
        dest: WWW_TMP
    }, {
        expand: true,
        cwd: WWW_SRC + "js_es2015",
        src: ["**/*.es2015"],
        dest: WWW_TMP + "js_es2015"
    }]
};
config.replace.cordova = {
    files: [{
        expand: true,
        cwd: CORDOVA_SRC + "js_es2015",
        src: ["**/*.es2015"],
        dest: CORDOVA_TMP + "js_es2015"
    }]
};
config.replace.views = {
    files: [{
        expand: true,
        cwd: VIEWS_SRC,
        src: ["**/*.mustache"],
        dest: VIEWS_TMP
    }]
};
config.replace.emails = {
    files: [{
        expand: true,
        cwd: EMAILS_SRC,
        src: ["**/*.mustache"],
        dest: EMAILS_TMP
    }]
};

config.htmlmin = {
    options: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeEmptyAttributes: true
    }
};
config.htmlmin.www = {
    files: [{
        "expand": true,
        "cwd": WWW_TMP,
        "src": ["**/*.html"],
        "dest": BUILD_DIR + "www" // following slash destroys directory structure
    }, {
        "expand": true,
        "cwd": WWW_TMP,
        "src": ["**/*.mustache"],
        "dest": BUILD_DIR + "www" // following slash destroys directory structure
    }]
};
config.htmlmin.views = {
    files: [{
        "expand": true,
        "cwd": VIEWS_TMP,
        "src": ["**/*.mustache"],
        "dest": VIEWS_BUILD,
        "ext": ".mustache"
    }]
};
config.htmlmin.emails = {
    files: [{
        "expand": true,
        "cwd": EMAILS_TMP,
        "src": ["**/*.mustache"],
        "dest": EMAILS_BUILD,
        "ext": ".mustache"
    }]
};

config.babel = {
    options: {
        sourceMap: true,
        presets: ['env']
    }
};
config.babel.www = {
    files: [{
        "expand": true,
        "cwd": WWW_TMP + "js_es2015/",
        "src": ["**/*.es2015"],
        "dest": WWW_TMP + "js/",
        "ext": ".js"
    }]
};
config.babel.cordova = {
    files: [{
        "expand": true,
        "cwd": CORDOVA_TMP + "js_es2015/",
        "src": ["**/*.es2015"],
        "dest": CORDOVA_TMP + "js/",
        "ext": ".js"
    }]
};

config.uglify = {
    options: {
        mangle: false,
        beautify: true
    }
};
config.uglify.www = {
    files: [{
        expand: true,
        cwd: WWW_TMP + 'js/',
        src: '**/*.js',
        dest: WWW_BUILD + "js/"
    }]
};
config.uglify.cordova = {
    files: [{
        expand: true,
        cwd: CORDOVA_TMP + 'js/',
        src: '**/*.js',
        dest: CORDOVA_BUILD + "js/"
    }]
};

config.copy = {};
config.copy.www = {
    files: [{
        expand: true,
        cwd: WWW_SRC + 'js_ext/',
        src: '**/*',
        dest: WWW_BUILD + "js/"
    }, {
        expand: true,
        cwd: WWW_SRC + 'img/',
        src: '**/*.{svg,png,jpg,jpeg,gif,json}',
        dest: WWW_BUILD + "img/"
    }, {
        expand: true,
        cwd: WWW_SRC + 'fonts/',
        src: '**/*',
        dest: WWW_BUILD + "fonts/"
    }, {
        expand: true,
        cwd: WWW_SRC + 'favicon/',
        src: '**/*',
        dest: WWW_BUILD + "favicon/"
    }]
};
config.copy.cordova = {
    files: [{
        expand: true,
        cwd: WWW_BUILD,
        src: '**/*',
        dest: CORDOVA_BUILD
    }]
};
config.copy.cordova_final = {
    files: [{
        expand: true,
        cwd: CORDOVA_BUILD,
        src: '**/*',
        dest: CORDOVA_FINAL
    }]
};

// config['string-replace'] = {};
// config['string-replace'].www = {
//     files: [{
//         src: WWW_BUILD + "index.html",
//         dest: WWW_BUILD + "index.html"
//     }],
//     options: {
//         replacements: [{
//             pattern: '{{VERSION}}',
//             replacement: PACKAGE.version
//         }]
//     }
// };

grunt.initConfig(config);

require('load-grunt-tasks')(grunt); // Automatically loads all grunt tasks.
// jfc why isn't this just included by default

grunt.registerTask('default', [
    "www-clean",
    "views-clean",
    "emails-clean"
]);

grunt.registerTask('cordova-www', [
    'www',
    'copy:cordova',
    'replace:cordova',
    'babel:cordova',
    'uglify:cordova',
    'copy:cordova_final'
]);

grunt.registerTask('cordova', [
    'cordova-www'
]);

grunt.registerTask('cordova-clean', [
    'clean:cordova',
    'cordova-www'
]);

grunt.registerTask('www-clean', [
    'clean:www',
    'www'
]);

grunt.registerTask('www', [
    'sass:www',
    'replace:www',
    'htmlmin:www',
    'babel:www',
    'uglify:www',
    'copy:www'
]);

grunt.registerTask('views-clean', [
    'clean:views',
    'views'
]);

grunt.registerTask('views', [
    'replace:views',
    'htmlmin:views'
]);

grunt.registerTask('emails-clean', [
    'clean:emails',
    'emails'
]);

grunt.registerTask('emails', [
    'replace:emails',
    'htmlmin:emails'
]);

};