LcatDB.Modal = class {
    constructor(title, url, callback) {
        this.title = title;
        this.url = url;
        this.callback = callback;

        this.initElements();
        this.initMessages();
        this.show();
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
                'modal.hide': this.hide.bind(this),
                'modal.lock': this.lock.bind(this),
                'modal.unlock': this.unlock.bind(this),
                'modal.done': () => this.callback(this),
                'modal.reload': window.location.reload
            };

            try { msgFunctions[msg](); } catch(e) {}
        }, false);
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