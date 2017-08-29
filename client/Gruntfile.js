const fs = require('fs');

module.exports = function(grunt) {

const PACKAGE = require("./package.json");

const TITLE = "lcatᴰᴮ";

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

var config = {};

config.clean = {};
config.clean.www = [
    "./build/www/**/*.*",
    "./tmp/www/**/*.*"
];
config.clean.views = [
    "./build/views/**/*.*",
    "./tmp/views/**/*.*"
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

// <!--nav--> must come before <!--nav_nouser-->!!!!!

let replacements = [{
    from: "<!--head-->",
    to: fs.readFileSync(TEMPLATES_DIR + "head.html", "utf8")
}, {
    from: "<!--nav-->",
    to: fs.readFileSync(TEMPLATES_DIR + "nav.html", "utf8")
}, {
    from: "<!--nav_nouser-->",
    to: fs.readFileSync(TEMPLATES_DIR + "nav_nouser.html", "utf8")
}, {
    from: "<!--footer-->",
    to: fs.readFileSync(TEMPLATES_DIR + "footer.html", "utf8")
}, {
    from: "<!--scripts-->",
    to: fs.readFileSync(TEMPLATES_DIR + "scripts.html", "utf8")
}, {
    from: "<!--script_map-->",
    to: fs.readFileSync(TEMPLATES_DIR + "script_map.html", "utf8")
}, {
    from: "<!--title-->",
    to: TITLE
}, {
    from: "<!--version-->",
    to: PACKAGE.version
}];

config.replace = {};
config.replace.www = {
    expand: true,
    src: [WWW_SRC + "pages/*.html"],
    dest: WWW_TMP,
    replacements: replacements
};
config.replace.views = {
    expand: true,
    src: [VIEWS_SRC + "*.mustache"],
    dest: VIEWS_TMP,
    replacements: replacements
};

config.htmlmin = {};
config.htmlmin.www = {
    options: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeEmptyAttributes: true
    },
    files: [{
        "expand": true,
        "cwd": WWW_TMP,
        "src": ["**/*.html"],
        "dest": WWW_BUILD,
        "ext": ".html"
    }]
};
config.htmlmin.views = {
    options: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeEmptyAttributes: true
    },
    files: [{
        "expand": true,
        "cwd": VIEWS_TMP,
        "src": ["**/*.mustache"],
        "dest": VIEWS_BUILD,
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
        "cwd": WWW_SRC + "js_es2015/",
        "src": ["**/*.es2015"],
        "dest": WWW_TMP + "js/",
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
    // src: [WWW_SRC + 'js/**/*.js', WWW_TMP + 'js/**/*.js'],
    // dest: WWW_BUILD + "js/script.min.js"
    files: [{
        expand: true,
        cwd: WWW_TMP + 'js/',
        src: '**/*.js',
        dest: WWW_BUILD + "js/"
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
    "views-clean"
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

};