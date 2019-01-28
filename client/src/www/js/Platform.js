import Utils from "./Utils";

class Platform {
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

    static resolveAppUrl(url, callback) {
        let result = {
            url: url,
            canNavigate: false
        };

        if (url == "") return callback(result);
        if (url == "#") return callback(result);

        let inAppPrefixes = [
            Platform.serverUrl,
            'file:///android_asset/www/',
            './', '/'
        ];

        if (window.cordova && window.cordova.file)
            inAppPrefixes.push(window.cordova.file.applicationDirectory || "");

        result.canNavigate = inAppPrefixes.some(val => {
            return url.startsWith(val);
        });

        if (!result.canNavigate) return callback(result);;
        if (!Platform.inApp) return callback(result);;

        inAppPrefixes.forEach(e => {
            if (result.url.substr(0, e.length) == e)
                result.url = result.url.substr(e.length);
        });
            
        // Trim query.
        let urlWithoutQuery = result.url.split('?')[0];

        new Utils.Chain(function() {
            Platform.initLocalFiles(() => this.next());
        }, function() {
            // If this url exists in the file list, it's local.
            result.isLocal = Platform.localFilelist.indexOf(urlWithoutQuery) != -1;

            if (result.isLocal) {
                if (Platform.isiOS) {
                    result.url = `${window.cordova.file.applicationDirectory}www/${result.url}`;
                    return callback(result);
                }
                
                result.url = `file:///android_asset/www/${result.url}`;
                return callback(result);
            }
            
            result.url = `${Platform.serverUrl}/${result.url}`;
            return callback(result);
        });
    }

    static initLocalFiles(callback) {
        if (Platform.localFilelist && callback) return callback();

        $.ajax({
            url: './files.json',
            dataType: 'json',
            cache: false,
            success: data => {
                Platform.localFilelist = data.map(obj => obj.location);
                if (callback) callback();
            }
        });
    }

    /*
     * Toggle elements that rely on the app being online.
     * @param {boolean} force - Update even if already set to proper state.
     */
    static handleOnline(force) {
        if (!force && (Platform.onLinePrevious == navigator.onLine)) return;

        Platform.onLinePrevious = navigator.onLine;

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
        Platform.handleOnline();
        setInterval(Platform.handleOnline, 1000);
    }

    static initiOSApp() {
        if (!Platform.inApp || !Platform.isiOS) return;

        $('base').each(function(i) {
            if (i > 0) $(this).remove();
        });

        $('base').attr("href", `${window.cordova.file.applicationDirectory}www/`);
    }

    static init() {
        Platform.initLocalFiles();
        Platform.initHandleOnline();
        Platform.initJs();
        Platform.handleOnline(true);
        Platform.initiOSApp();
    }

    static get inApp() { return typeof window.cordova != 'undefined'; }
    static get isiOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; }

    static get version() { return "<!--version-->"; }
    static get commit() { return "<!--commit-->"; }
    static get serverUrl() { return "<!--url-->"; }
}

Platform.isWebsite = true; // This should be overwritter in cordova builds by an injection script

export default Platform;