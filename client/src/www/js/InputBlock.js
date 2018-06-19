LcatDB.InputBlock = class {
    static init() { LcatDB.InputBlock.amt = 0; }
    
    /*
     * Begin preventing user input with a full-screen element.
     */
    static start() {
        $('#loading-overlay').removeClass('hide');
        setTimeout(function() {
            $('#loading-overlay').removeClass('disabled');
        }, 10);
        LcatDB.InputBlock.amt++;
    }

    /*
     * Allow user input after blocking.
     */
    static finish() {
        if (--LcatDB.InputBlock.amt > 0) return;

        LcatDB.InputBlock.amt = 0;
        
        $('#loading-overlay').addClass('disabled');
        setTimeout(function() {
            $('#loading-overlay').addClass('hide');
        }, 250);
    }
};