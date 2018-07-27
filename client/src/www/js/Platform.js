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

	/* Workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=553418 */
	static fixUrlHistoryPushState(url) {
        if (url.startsWith('file:///android_asset/www/'))
            return '.' + url.substr(25);

        if (window.cordova && url.startsWith(window.cordova.file.applicationDirectory))
            return '.' + url.substr(window.cordova.file.applicationDirectory.length - 1);

        return url;
	}

    static resolveAppUrl(url, callback) {
        let result = {
            url: url,
            canNavigate: false
        };

        if (url == "") return callback(result);
        if (url == "#") return callback(result);

        let inAppPrefixes = [
            LcatDB.serverUrl,
            'file:///android_asset/www/',
            './', '/'
        ];

        if (window.cordova && window.cordova.file)
            inAppPrefixes.push(window.cordova.file.applicationDirectory || "");

        result.canNavigate = inAppPrefixes.some(val => {
            return url.startsWith(val);
        });

        if (!result.canNavigate) return callback(result);;
        if (!LcatDB.Platform.inApp()) return callback(result);;

        inAppPrefixes.forEach(e => {
            if (result.url.substr(0, e.length) == e)
                result.url = result.url.substr(e.length);
        });
            
        // Trim query.
        let urlWithoutQuery = result.url.split('?')[0];

        new LcatDB.Utils.Chain(function() {
            LcatDB.Platform.initLocalFiles(() => this.next());
        }, function() {
            // If this url exists in the file list, it's local.
            result.isLocal = LcatDB.Platform.localFilelist.indexOf(urlWithoutQuery) != -1;

            if (result.isLocal) {
                if (LcatDB.Platform.isiOS()) {
                    result.url = `${window.cordova.file.applicationDirectory}www/${result.url}`;
                    return callback(result);
                }
                
                result.url = `file:///android_asset/www/${result.url}`;
                return callback(result);
            }
            
            result.url = `${LcatDB.serverUrl}/${result.url}`;
            return callback(result);
        });
    }

    static initNavigation() {
        if (window.parent != window) return;
        
        $('a').each(function() {
            let $this = $(this);
            let url = $this.attr('href');
            
            if (typeof url == "undefined") return;
            if (url == "") return;
            if (url.indexOf("#") == 0) return;

            if ($this.hasClass('nav-ignore')) return;

            $(this).off('click.nav').on('click.nav', e => {
                e.preventDefault();
                LcatDB.Pages.navigate($(this).attr("href"));
            });
        });
    }

    static initLocalFiles(callback) {
        if (LcatDB.Platform.localFilelist && callback) return callback();

        $.ajax({
            url: './files.json',
            dataType: 'json',
            cache: false,
            success: data => {
                LcatDB.Platform.localFilelist = data.map(obj => obj.location);
                if (callback) callback();
            }
        });
    }

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

    static isiOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    static initiOSApp() {
        if (!LcatDB.Platform.inApp() || !LcatDB.Platform.isiOS()) return;

        $('base').each(function(i) {
            if (i > 0) $(this).remove();
        });

        $('base').attr("href", `${window.cordova.file.applicationDirectory}www/`);
    }

    static init() {
        LcatDB.Platform.initLocalFiles();
        LcatDB.Platform.initHandleOnline();
        LcatDB.Platform.initJs();
        LcatDB.Platform.initNavigation();
        LcatDB.Platform.handleOnline(true);
        LcatDB.Platform.initiOSApp();
    }

    static openLoginModal() {
        if (LcatDB.Platform.loginModalIsOpen) return;

        LcatDB.Platform.loginModalIsOpen = true;
        
        (new LcatDB.Modal(
            "Login",
            "./loginModal.html",
            modal => {
                LcatDB.Platform.loginModalIsOpen = false;
                LcatDB.Pages.reload();
            }
        )).lock();
    }

    static version() { return "<!--version-->"; }
    static commit() { return "<!--commit-->"; }
}