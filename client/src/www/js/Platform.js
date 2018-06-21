LcatDB.Platform = class {
    static testCordova(callback) {
        if (typeof window.cordova != 'undefined') return callback(true);

        const cordovaTimerMax = 1000;

        let cordovaTimer = 1000;
        let cordovaInterval = setInterval(function() {
            cordovaTimer += 10;
            if (typeof window.cordova != 'undefined') {
                callback(true);
                clearInterval(cordovaInterval);
            } else if (cordovaTimer >= cordovaTimerMax) {
                callback(false);
                clearInterval(cordovaInterval);
            }
        }, 10);
    }

    static inApp() {
        return typeof window.cordova != 'undefined';
    }

    static initNavigation(force) {
        if (window.parent != window) return;
        
        $('a').each(function() {
            let $this = $(this);
            let href = $this.attr('href');
            
            if (typeof href == "undefined") return;
            if (href == "") return;
            if (href == "#") return;

            let canNavigate = [LcatDB.serverUrl, "./", "/"].some(val => {
                return href.startsWith(val);
            });
            if (!canNavigate) return;
            if ($this.hasClass('nav-ignore')) return;

            if (LcatDB.Platform.inApp()) {
                // Trim leading dot.
                if (href.substr(0, 1) == '.')
                    href = href.substr(1);
    
                // Trim leading slash. (if no slash then it's not valid)
                if (href.substr(0, 1) == '/')
                    href = href.substr(1);
                else return;
                    
                // Trim query.
                href = href.split('?')[0];
                
                // If this url exists in the file list, it's local.
                let isLocal = LcatDB.Platform.localFilelist.indexOf(href) != -1;
                
                $(this).off('click.nav').on('click.nav', e => {
                    e.preventDefault();
    
                    let hrefFinal;
                    if (isLocal) {
                        if (LcatDB.Platform.isiOS())
                            hrefFinal = `${window.cordova.file.applicationDirectory}www/${href}`;
                        else
                            hrefFinal = `file:///android_asset/www/${href}`;
                    } else hrefFinal = `${LcatDB.serverUrl}/${href}`;
    
                    LcatDB.Pages.navigate(hrefFinal);
                });
            } else {
                $this.off('click.nav').on('click.nav', e => {
                    e.preventDefault();
                    LcatDB.Pages.navigate(href);
                });
            }

        });
    }

    static initLocalFiles() {
        if (LcatDB.Platform.localFilelist) return;

        $.ajax({
            url: './files.json',
            dataType: 'json',
            cache: false,
            success: function(data) {
                LcatDB.Platform.localFilelist = data.map(obj => obj.location);
                // fileList is a list of files that can be accessed locally.
            }
        });
    }

    // static appUrls(force) {
    //     if (!force && !LcatDB.Platform.inApp()) return;

    //     $(".cordova_only_hide").show();
    //     $("body").addClass("in-app");

    //     $.ajax({
    //         url: './files.json',
    //         dataType: 'json',
    //         cache: true,
    //         success: function(data) {
    //             let filelist = data.map(obj => obj.location);
    //             // fileList is a list of files that can be accessed locally.
                
    //             // Get all links and process them.
    //             $('a').each(function() {
    //                 let href = $(this).attr('href');
        
    //                 if (typeof href == 'undefined') return;
        
    //                 // Trim leading dot.
    //                 if (href.substr(0, 1) == '.')
    //                     href = href.substr(1);
        
    //                 // Trim leading slash. (if no slash then it's not valid)
    //                 if (href.substr(0, 1) == '/')
    //                     href = href.substr(1);
    //                 else return;
                        
    //                 // Trim query.
    //                 href = href.split('?')[0];
                    
    //                 // If this url exists in the file list, it's local.
    //                 let isLocal = filelist.indexOf(href) != -1;
                    
    //                 $(this).off('click.appurl').on('click.appurl', e => {
    //                     e.preventDefault();

    //                     let hrefFinal;
    //                     if (isLocal) {
    //                         if (LcatDB.Platform.isiOS())
    //                             hrefFinal = `${window.cordova.file.applicationDirectory}www/${href}`;
    //                         else
    //                             hrefFinal = `file:///android_asset/www/${href}`;
    //                     } else hrefFinal = `${LcatDB.serverUrl}/${href}`;

    //                     window.open(hrefFinal);
    //                 });
    //             });
    //         }
    //     });
    // }

    /*
     * Toggle elements that rely on the app being online.
     * @param {boolean} force - Update even if already set to proper state.
     */
    static handleOnline(force) {
        if (!force && (LcatDB.Platform.onLinePrevious == navigator.onLine)) return;

        LcatDB.Platform.onLinePrevious = navigator.onLine;

        $('body')[navigator.onLine ? 'addClass' : 'removeClass']('is-online');

        $(".online_only_hide")[navigator.onLine ? 'show' : 'hide']();
        $(".online_only_disable")
            .prop('disabled', !navigator.onLine)
            [navigator.onLine ? 'removeClass' : 'addClass']('disabled');

        $(".offline_only_hide")[navigator.onLine ? 'hide' : 'show']();
        $(".offline_only_disable")
            .prop('disabled', navigator.onLine)
            [navigator.onLine ? 'addClass' : 'removeClass']('disabled');
    }

    /*
     * Show/hide elements tied to JS availability.
     */
    static initJs() {
        $('.js').removeClass('js');
        $('.no-js').hide();
    }

    static initHandleOnline() {
        LcatDB.Platform.handleOnline();
        setInterval(LcatDB.Platform.handleOnline, 1000);
    }

    static init() {
        LcatDB.Platform.initLocalFiles();
        LcatDB.Platform.initHandleOnline();
        LcatDB.Platform.initJs();
        LcatDB.Platform.initNavigation();
    }
}