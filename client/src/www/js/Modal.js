LcatDB.Modal = class {
    constructor(options) {
        this._options = options;
        this.data = this._options.data;

        if (this._options.url)
            LcatDB.Platform.resolveAppUrl(this._options.url, urlResolution => {
                this._options.body = `<iframe src="${urlResolution.url}" scrolling="no"></iframe>`;
                this.init();
            });
        else this.init();
    }
    
    init() {
        this.initElements();
        this.initMessages();
    }

    initElements() {
        this._$modal = $(`
<div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog ${this._options.size ? `modal-${this._options.size}` : ''}" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
                <h3 class="modal-title">
                    ${this._options.title}
                </h3>
                <hr>
            </div>
            <div class="modal-body">
                ${this._options.body}
            </div>
            <div class="modal-footer"></div>
        </div>
    </div>
</div>
            `);

        this._$modalCloseBtn = this._$modal.find('.close');
        let buttonData = this._options.closeButton;
        if (buttonData && (buttonData.disabled))
            this._$modalCloseBtn.hide();
        else
            this.initButtonAction(this._$modalCloseBtn, buttonData);
        
        this._$modalFooter = this._$modal.find('.modal-footer');
        if (this._options.buttons && this._options.buttons.length > 0)
            this._options.buttons.forEach(
                buttonData => this.initButton(buttonData)
            );
        else this._$modalFooter.remove();

        $('body').append(this._$modal);

        this._$modal.modal({
            backdrop: this._options.backdrop || true,
            keyboard: this._options.keyboard || true,
            focus: this._options.focus || true,
            show: this._options.show || true
        });

        if (this._options.url) {
            this._$iframe = $(this._$modal.find('iframe'));
            this._$iframe.iFrameResize();
        }
    }

    initButtonAction($button, buttonData) {
        $button.click(() => {
            if (buttonData && (typeof buttonData.action == 'function'))
                buttonData.action(this);
            else this.close();
        });
    }

    initButton(buttonData) {
        let $button = $(`
            <button type="button" class="btn ${buttonData.class}">
                ${buttonData.text}
            </button>
        `);
        
        if (buttonData.type)
            $button.addClass(`btn-${buttonData.type}`);

        this.initButtonAction($button, buttonData);
        
        this._$modalFooter.append($button);
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
        if (this._options.callback)
            this._options.callback(this);
        this.close();
    }
    reload() {
        LcatDB.Pages.reload();
        this.close();
    }
    lock() {
        this._$modalCloseBtn.hide();
        this._$modalFooter.css({
            height: 0,
            opacity: 0
        });
    }
    unlock() {
        this._$modalCloseBtn.show();
        this._$modalFooter.css({
            height: '',
            opacity: 1
        });
    }

    // deinit() { this.$element.remove(); }

    toggle()       { this._$modal.modal('toggle'); }
    show()         { this._$modal.modal('show'); }
    hide()         { this._$modal.modal('hide'); }
    dispose()      { this._$modal.modal('dispose'); }

    close() {
        this.hide();
        setTimeout(() => this.destroy(), 2000);
    }

    destroy() {
        this.dispose();
        this._$modal.remove();
    }

    on(eventName, callback) {
        this._$modal.on(`${eventName}.bs.modal`, callback);
    }
};