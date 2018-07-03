LcatDB.Modal = class {
    constructor(title, url, callback) {
        this.title = title;
        this.callback = callback;
        LcatDB.Platform.resolveAppUrl(url, urlResolution => {
            this.url = urlResolution.url;
            
            this.initElements();
            this.initMessages();
            this.show();
        });
    }

    initElements() {
        this.$element = $('<div></div>');
        this.$element.addClass('modal fade').html(`\
<div class="modal-dialog">
    <div class="modal-content">
        <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">&times;</button>
            <h4 class="modal-title">${this.title}</h4>
        </div>
        <div class="modal-body">
            <iframe src="${this.url}" scrolling="no"></iframe>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-default btn-close" data-dismiss="modal">Cancel</button>
        </div>
    </div>
</div>`);

        $('body').append(this.$element);

        this.$iframe = $(this.$element.find('iframe'));
        this.$iframe.iFrameResize();

        this.$element.on('hidden.bs.modal', this.deinit.bind(this));
    }

    initMessages() {
        window.addEventListener('message', (e) => {
            let msg = e.data;

            let msgFunctions = {
                'modal.hide': () => this.hide(),
                'modal.lock': () => this.lock(),
                'modal.unlock': () => this.unlock(),
                'modal.done': () => this.done(),
                'modal.reload': () => this.reload()
            };

            try { msgFunctions[msg](); } catch(e) {}
        }, false);
    }

    done() {
        this.callback(this);
        this.hide();
        setTimeout(() => this.deinit(), 2000);
    }
    reload() {
        LcatDB.Pages.reload();
        this.hide();
        setTimeout(() => this.deinit(), 2000);
    }
    show() { this.$element.modal('show'); }
    hide() { this.$element.modal('hide'); }
    lock() {
        this.$element.find('.close').hide();
        this.$element.find('.btn-close').hide();
    }
    unlock() {
        this.$element.find('.close').show();
        this.$element.find('.btn-close').show();
    }

    deinit() { this.$element.remove(); }
};