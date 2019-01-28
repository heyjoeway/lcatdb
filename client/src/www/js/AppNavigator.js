const fs = require('fs'); // Browserify transform

import ModalsCommon from "./ModalsCommon";
import MapsCommon from "./MapsCommon";
import Platform from "./Platform";
import InputBlock from "./InputBlock";
import Utils from "./Utils";
import Sidebar from "./Sidebar";
import UnitSystem from "./UnitSystem";
import PageClasses from "./PageClasses";

class AppNavigator {
    static updateLinks() {
        if (window.parent != window) return;
        
        $('a').each(function() {
            let $this = $(this);
            let url = $this.attr('href');
            
            if (typeof url == "undefined") return;
            if (url == "") return;
			if (url.indexOf("#") == 0) return;
			
			if (url == "reload") {
				$(this).off('click.nav').on('click.nav', e => {
					e.preventDefault();
					AppNavigator.reload();
				});
				return;
			}	

            if ($this.hasClass('nav-ignore')) return;

            $(this).off('click.nav').on('click.nav', e => {
                e.preventDefault();
                AppNavigator.go($(this).attr("href"));
            });
        });
    }

    /* Workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=553418 */
	static fixUrlHistoryPushState(url) {
        if (url.startsWith('file:///android_asset/www/'))
            return '.' + url.substr(25);

        if (window.cordova && url.startsWith(window.cordova.file.applicationDirectory))
            return '.' + url.substr(window.cordova.file.applicationDirectory.length - 1);

        return url;
    }

	static init() {
		AppNavigator.currentUrl = location.href;

		AppNavigator.initPage();

		window.onpopstate = event => AppNavigator.go(location.href, true);
	}

	static initPage() {
		let $body = $('body'); 
		let classesCurrent = $body.attr('class') || ''; 
		classesCurrent.split(' ').forEach(className => {
			if (className.startsWith('page-'))
				$body.removeClass(className);
		});

		let className = $('meta[name="app:page"]').prop("content");
		$body.addClass(`page-${className}`);
		let classRef = PageClasses[className];

		if (typeof classRef != "undefined")
			AppNavigator.current = new classRef();

		UnitSystem.init();
		Platform.init();
		AppNavigator.updateLinks();
		MapsCommon.init();
		ModalsCommon.init();

		$('.selectpicker').selectpicker();
		$('input[type="password"]').password();
	}

	static reload() { AppNavigator.go(AppNavigator.currentUrl, true); }

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
		// Platform.initiOSApp(); // ?

		$("html").scrollTop(0);

		let $html = $($("<div></div>").html(htmlString));

		if (AppNavigator.current)
			AppNavigator.current.deinit();
		
		let title = $html.find("title").html();

		if (!Platform.inApp || !Platform.isiOS) {
			if (replaceHistory) history.replaceState({}, title,
				AppNavigator.fixUrlHistoryPushState(url)
			);
			else if (!skipHistory) history.pushState({}, title,
				AppNavigator.fixUrlHistoryPushState(url)
			);
		}

		AppNavigator.currentUrl = url;

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

		if (refreshNav) Sidebar.update();

		AppNavigator.initPage();
		AppNavigator.fadeInContent();
		AppNavigator.hideSpinner();
	}

	static go(url, skipHistory, replaceHistory) {
		new Utils.Chain(function() {
			Platform.resolveAppUrl(url, urlRes => this.next(urlRes));
		}, function(urlResolution) {
			url = urlResolution.url;

			// If can't navigate, then url is remote. Open externally
			if (!urlResolution.canNavigate)
				return window.open(url, '_system');
			
			// Remote URL cannot GET from local files
			if (Platform.isWebsite && Platform.inApp && urlResolution.isLocal)
				return window.open(url);

			// Give time for css anim
			this.pause();
			AppNavigator.fadeOutContent(() => this.next());

			AppNavigator.showSpinner();

			// Load data
			// xhr is used to capture final url in case of redirect
			this.xhr = new XMLHttpRequest();

			$.ajax({
				url: url,
				method: 'GET',
				dataType: 'html',
				xhr: () => this.xhr,
				success: data => {
					this.htmlString = data;
					this.next();	
				},
				error: () => {
					this.htmlString = fs.readFileSync(
						__dirname + "/templates/error.html"
					).toString();
					this.next();
				}
			});
		}, function() {
			AppNavigator.populateContent(
				this.htmlString,
				this.xhr.responseURL || url,
				skipHistory,
				replaceHistory
			)
		});
	}

	static submitFormAjax($form) {
        let xhr = new XMLHttpRequest();

        InputBlock.start();

        $.ajax({
            url: $form.prop('action'),
            method: $form.prop('method'),
            data: $form.serialize(),
            dataType: 'html',
            xhr: () => xhr,
            success: (data, status) => {
                InputBlock.finish();
                if (status != "success") return;
                AppNavigator.populateContent(data, xhr.responseURL);
            },
            failure: () => InputBlock.finish()
        });
    }
}

export default AppNavigator;