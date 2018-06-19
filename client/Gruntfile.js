const fs = require('fs');
module.exports = function(grunt) {

const PACKAGE = require("./package.json");
const CONFIG = require("./config.json");

const TITLE = CONFIG.title;
const URL = CONFIG.url;
const CORDOVA_ANDROID_BASE = '<base href="file:///android_asset/www/">';
const CORDOVA_IOS_BASE = '<base href="./">';

const SRC_DIR = "./src";
const BUILD_DIR = "./build";
const TMP_DIR = "./tmp";
const TEMPLATES_DIR = SRC_DIR + "/templates";

// Also, I'm adding an extra layer onto the build/src directories in case we
// ever want to build for a different platform.
// Update: We did. Good call.

const WWW_SRC = SRC_DIR + "/www";
const WWW_BUILD = BUILD_DIR + "/www";
const WWW_TMP = TMP_DIR + "/www";

const VIEWS_SRC = SRC_DIR + "/views";
const VIEWS_BUILD = BUILD_DIR + "/views";
const VIEWS_TMP = TMP_DIR + "/views";

const EMAILS_SRC = SRC_DIR + "/emails";
const EMAILS_BUILD = BUILD_DIR + "/emails";
const EMAILS_TMP = TMP_DIR + "/emails";

const CORDOVA_SRC = SRC_DIR + "/www_cordova";
const CORDOVA_BUILD = BUILD_DIR + "/www_cordova";
const CORDOVA_TMP = TMP_DIR + "/www_cordova";

const CORDOVA_ROOT = "./cordova";

const CORDOVA_ANDROID_FINAL = CORDOVA_ROOT + "/merges/android";
const CORDOVA_IOS_FINAL = CORDOVA_ROOT + "/merges/ios";

var config = {};

config.clean = {};
config.clean.cordova = [
    CORDOVA_BUILD + "/**/*.*",
    CORDOVA_TMP + "/**/*.*"
];
config.clean.cordova_android = [
    CORDOVA_ANDROID_FINAL + "/**/*.*"
];
config.clean.cordova_ios = [
    CORDOVA_IOS_FINAL + "/**/*.*"
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
        src: WWW_SRC + "/css/style.scss",
        dest: WWW_BUILD + "/css/style.min.css"
    }]
};

config.gitinfo = {};

// <!--nav--> must come before <!--nav_nouser--> and <!--nav_user-->!!!!!

let readTemplate = template =>
    fs.readFileSync(`${TEMPLATES_DIR}/${template}`, "utf8");

let replacements = [{
    match: "<!--head-->",
    replacement: readTemplate(`head.html`)
}, {
    match: "<!--nav_user-->",
    replacement: readTemplate(`nav_user.html`)
}, {
    match: "<!--nav_nouser-->",
    replacement: readTemplate(`nav_nouser.html`)
}, {
    match: "<!--nav_auto-->",
    replacement: readTemplate(`nav_auto.html`)
}, {
    match: "<!--nav_blank-->",
    replacement: readTemplate(`nav_blank.html`)
}, {
    match: "<!--footer-->",
    replacement: readTemplate(`footer.html`)
}, {
    match: "<!--scripts-->",
    replacement: readTemplate(`scripts.html`)
}, {
    match: "<!--title-->",
    replacement: TITLE
}, {
    match: "<!--version-->",
    replacement: PACKAGE.version
}, {
    match: "<!--url-->",
    replacement: URL
}, {
    match: "<!--requires_email_start-->",
    replacement: CONFIG.email ? "" : "<!--"
}, {
    match: "<!--requires_email_end-->",
    replacement: CONFIG.email ? "" : "-->"    
}, {
    match: "<!--map_url-->",
    replacement: CONFIG.map.url
}, {
    match: "<!--map_attribution-->",
    replacement: CONFIG.map.attribution
}, {
    match: "<!--map_id-->",
    replacement: CONFIG.map.id
}, {
    match: "<!--map_token-->",
    replacement: CONFIG.map.token
}, {
    match: "<!--email_bot-->",
    replacement: CONFIG.emailAddressBot
}, {
    match: "<!--commit-->",
    replacement: () => grunt.config.data.gitinfo.local.branch.current.shortSHA
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
        cwd: WWW_SRC + "/pages",
        src: ["**/*.html", "**/*.mustache"],
        dest: WWW_TMP
    }, {
        expand: true,
        cwd: WWW_SRC + "/js_es2015",
        src: ["**/*.es2015"],
        dest: WWW_TMP + "/js_es2015"
    }]
};
config.replace.www_recursive = {
    files: [{
        expand: true,
        cwd: WWW_TMP,
        src: ["**/*.html", "**/*.mustache"],
        dest: WWW_TMP
    }]
};
config.replace.cordova = {
    files: [{
        expand: true,
        cwd: CORDOVA_SRC + "/js_es2015",
        src: ["**/*.es2015"],
        dest: CORDOVA_TMP + "/js_es2015"
    }, {
        expand: true,
        cwd: CORDOVA_SRC + "/pages",
        src: ["**/*.html", "**/*.mustache"],
        dest: CORDOVA_TMP
    }, {
        src: [CORDOVA_ROOT + "/config.src.xml"],
        dest: CORDOVA_ROOT + "/config.xml"
    }]
};
config.replace.cordova_android_final = {
    options: {
        patterns: [{
            match: "<!--base_cordova-->",
            replacement: CORDOVA_ANDROID_BASE
        }],
        prefix: ""
    },
    files: [{
        expand: true,
        cwd: CORDOVA_BUILD,
        src: ["**/*.html", "**/*.mustache"],
        dest: CORDOVA_BUILD
    }]
};
config.replace.cordova_ios_final = {
    options: {
        patterns: [{
            match: "<!--base_cordova-->",
            replacement: CORDOVA_IOS_BASE
        }],
        prefix: ""
    },
    files: [{
        expand: true,
        cwd: CORDOVA_BUILD,
        src: ["**/*.html", "**/*.mustache"],
        dest: CORDOVA_BUILD
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
config.replace.views_recursive = {
    files: [{
        expand: true,
        cwd: VIEWS_TMP,
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
        removeComments: false, // KEEP THIS, needed to set cordova base
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
        "dest": BUILD_DIR + "/www" // following slash destroys directory structure
    }, {
        "expand": true,
        "cwd": WWW_TMP,
        "src": ["**/*.mustache"],
        "dest": BUILD_DIR + "/www" // following slash destroys directory structure
    }]
};
config.htmlmin.cordova = {
    files: [{
        "expand": true,
        "cwd": CORDOVA_TMP,
        "src": ["**/*.html"],
        "dest": BUILD_DIR + "/www_cordova" // following slash destroys directory structure
    }, {
        "expand": true,
        "cwd": CORDOVA_TMP,
        "src": ["**/*.mustache"],
        "dest": BUILD_DIR + "/www_cordova" // following slash destroys directory structure
    }]
}
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

let browserifyPrefs = {
    src: [
        WWW_SRC + "/js/main.js",
    ],
    dest: WWW_BUILD + "/js/common.js",
    transform: [
        ["browserify-replace", { replace: [{
            from: /<!--head-->/,
            to: readTemplate(`head.html`)
        }, {
            from: /<!--nav_user-->/,
            to: readTemplate(`nav_user.html`)
        }, {
            from: /<!--nav_nouser-->/,
            to: readTemplate(`nav_nouser.html`)
        }, {
            from: /<!--nav_auto-->/,
            to: readTemplate(`nav_auto.html`)
        }, {
            from: /<!--nav_blank-->/,
            to: readTemplate(`nav_blank.html`)
        }, {
            from: /<!--footer-->/,
            to: readTemplate(`footer.html`)
        }, {
            from: /<!--scripts-->/,
            to: readTemplate(`scripts.html`)
        }, {
            from: /<!--title-->/,
            to: TITLE
        }, {
            from: /<!--version-->/,
            to: PACKAGE.version
        }, {
            from: /<!--url-->/,
            to: URL
        }, {
            from: /<!--requires_email_start-->/,
            to: CONFIG.email ? "" : "<!--"
        }, {
            from: /<!--requires_email_end-->/,
            to: CONFIG.email ? "" : "-->"    
        }, {
            from: /<!--map_url-->/,
            to: CONFIG.map.url
        }, {
            from: /<!--map_attribution-->/,
            to: CONFIG.map.attribution
        }, {
            from: /<!--map_id-->/,
            to: CONFIG.map.id
        }, {
            from: /<!--map_token-->/,
            to: CONFIG.map.token
        }, {
            from: /<!--email_bot-->/,
            to: CONFIG.emailAddressBot
        }, {
            from: /<!--commit-->/,
            to: () => grunt.config.data.gitinfo.local.branch.current.shortSHA
        } ] } ],
        ["babelify", { "presets": ["env"] }],
        ["brfs"]
    ],
    bundles: {
        outputs: [
            WWW_BUILD + "/js/main.js"
        ]
    }    
};

config.browserify = {};
config.browserify["www-watch"] = {
    src: browserifyPrefs.src,
    dest: browserifyPrefs.dest,
    options: {
        browserifyOptions: { debug: true },
        transform: browserifyPrefs.transform,
        plugin: [
            ["factor-bundle", browserifyPrefs.bundles]
        ],
        watch: true,
        keepAlive: true
    }
};
config.browserify.www_dev = {
    src: browserifyPrefs.src,
    dest: browserifyPrefs.dest,
    options: {
        browserifyOptions: { debug: true },
        transform: browserifyPrefs.transform,
        plugin: [
            ["factor-bundle", browserifyPrefs.bundles]
        ]
    }
};
config.browserify.www_release = {
    src: browserifyPrefs.src,
    dest: browserifyPrefs.dest,
    options: {
        browserifyOptions: { debug: false },
        transform: browserifyPrefs.transform,
        plugin: [
            ["factor-bundle", browserifyPrefs.bundles],
            ["minifyify", { map: false }]
        ]
    }
};

config.copy = {};
config.copy.www = {
    files: [{
        expand: true,
        cwd: WWW_SRC + "/js_ext/",
        src: "**/*",
        dest: WWW_BUILD + "/js/"
    }, {
        expand: true,
        cwd: WWW_SRC + "/img/",
        src: "**/*.{svg,png,jpg,jpeg,gif,json}",
        dest: WWW_BUILD + "/img/"
    }, {
        expand: true,
        cwd: WWW_SRC + "/fonts/",
        src: "**/*",
        dest: WWW_BUILD + "/fonts/"
    }, {
        expand: true,
        cwd: WWW_SRC + "/favicon/",
        src: "**/*",
        dest: WWW_BUILD + "/favicon/"
    }]
};
config.copy.cordova = {
    files: [{
        expand: true,
        cwd: WWW_BUILD,
        src: "**/*",
        dest: CORDOVA_BUILD
    }]
};
config.copy.cordova_android_final = {
    files: [{
        expand: true,
        cwd: CORDOVA_BUILD,
        src: "**/*",
        dest: CORDOVA_ANDROID_FINAL
    }]
};
config.copy.cordova_ios_final = {
    files: [{
        expand: true,
        cwd: CORDOVA_BUILD,
        src: "**/*",
        dest: CORDOVA_IOS_FINAL
    }]
};

config.folder_list = {};
config.folder_list.www = {
    options: {
        files: true,
        folders: true
    },
    files: [{
        cwd: WWW_BUILD + "/",
        src: ["**"],
        dest: WWW_BUILD + "/files.json"
    }]
};

config.concurrent = {};
config.concurrent.www = [
    'sass:www',
    'htmlmin:www',
    'browserify:www_dev'
];
config.concurrent['cordova-www'] = [
    'htmlmin:cordova',
    'browserify:cordova'
];
config.concurrent['watch-all'] = [
    "watch:views",
    "watch:emails",
    "watch:cordova"
];

config.watch = {};
config.watch.www = {
    files: WWW_SRC + "/**/*",
    tasks: ["www-clean"]
};
config.watch.views = {
    files: VIEWS_SRC + "/**/*",
    tasks: ["views-clean"]
};
config.watch.emails = {
    files: EMAILS_SRC + "/**/*",
    tasks: ["emails-clean"]
};
config.watch.cordova_android = {
    files: [
        CORDOVA_SRC + "/**/*",
        WWW_SRC + "/**/*"
    ],
    tasks: [
        "cordova_android-clean"
    ]
};
config.watch.cordova_ios = {
    files: [
        CORDOVA_SRC + "/**/*",
        WWW_SRC + "/**/*"
    ],
    tasks: [
        "cordova_ios-clean"
    ]
};

grunt.initConfig(config);

require('load-grunt-tasks')(grunt); // Automatically loads all grunt tasks.
// jfc why isn't this just included by default

grunt.registerTask('default', [
    "www-clean",
    // "cordova-www",
    "views-clean",
    "emails-clean"
]);


grunt.registerTask('cordova-www', [
    'www',
    'copy:cordova',
    'replace:cordova',
    'concurrent:cordova-www'
]);

grunt.registerTask('cordova_android-www', [
    'cordova-www',
    'replace:cordova_android_final',
    'copy:cordova_android_final'
]);

grunt.registerTask('cordova_ios-www', [
    'cordova-www',
    'replace:cordova_ios_final',
    'copy:cordova_ios_final'
]);

grunt.registerTask('cordova', [
    'cordova-www'
]);

grunt.registerTask('cordova_android-clean', [
    'clean:www',    
    'clean:cordova',
    'clean:cordova_android',
    'cordova_android-www'
]);

grunt.registerTask('cordova_ios-clean', [
    'clean:www',    
    'clean:cordova',
    'clean:cordova_ios',
    'cordova_ios-www'
]);



grunt.registerTask('www-clean', [
    'clean:www',
    'www'
]);

grunt.registerTask('www', [
    'gitinfo',
    'replace:www',
    'replace:www_recursive',
    'concurrent:www',
    'copy:www',
    'folder_list:www'
]);


grunt.registerTask('views-clean', [
    'clean:views',
    'views'
]);

grunt.registerTask('views', [
    'replace:views',
    'replace:views_recursive',
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



grunt.registerTask('watch-all', [
    "cordova-www",
    "views-clean",
    "emails-clean",
    "concurrent:watch-all"
]);

};