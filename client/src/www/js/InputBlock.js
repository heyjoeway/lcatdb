class InputBlock {
    static init() { InputBlock.amt = 0; }
    
    /**
     * Begin preventing user input with a full-screen element.
     */
    static start() {
        $('#loading-overlay').removeClass('hide');
        setTimeout(function() {
            $('#loading-overlay').removeClass('disabled');
        }, 10);
        InputBlock.amt++;
    }

    /**
     * Allow user input after blocking.
     * 
     * @param {number} amt Number of blocks to clear. If number is negative, then clear all.
     */
    static finish(amt = 1) {
        if (amt < 0) InputBlock.amt = 0;
        else InputBlock.amt -= amt;
        
        if (InputBlock.amt > 0) return;

        InputBlock.amt = 0;
        
        $('#loading-overlay').addClass('disabled');
        setTimeout(function() {
            $('#loading-overlay').addClass('hide');
        }, 250);
    }
}

export default InputBlock;