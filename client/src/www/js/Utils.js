LcatDB.Utils = class {
    /*
     * Create object from URL query.
     * ex.
     * '?foo=bar&lorem=ipsum' ->
     * { foo: 'bar', lorem: 'ipsum' }
     *
     * @param {string} url
     */
    static urlQueryObj(url) {
        let query = url.split('?')[1];
        let obj = {};
        if (!query) return obj;

        let querySplit = query.split('&');
        querySplit.forEach((item) => {
            let itemSplit = item.split('=');
            let key = itemSplit[0];
            let val = undefined; 
            
            if (itemSplit.length > 1)
                val = itemSplit.splice(1).join('=');

            obj[key] = val;
        });

        return obj;
    }

    static genUid(size = 32) {
        let uid = "";
        let charSet = "QWERTYUIOPASDFGHJKLZXCVBNM1234567890";
        for (let i = 0; i < size; i++)
            uid += charSet[Math.round(Math.random() * (charSet.length - 1))];
        return uid;
    }

    static jqValueSet($element, newVal) {
        let propType = $element.prop('type');

        if (propType == 'radio') {
            $element.prop(
                'checked',
                $element.val() == newVal
            );
        } else if (propType == 'checkbox') {
            $element.prop('checked', newVal);
        } else $element.val(newVal);
    }

    static jqValueGet($element) {
        let propType = $element.prop('type');
        let propVal = $element.val();

        if (propType == 'radio') {
            if (!$element.prop('checked'))
                return undefined;
        } else if (propType == 'checkbox')
            propVal = $element.prop('checked');
        else if (propType == 'number') {
            if (($element.attr('step') % 1) == 0)
                propVal = parseInt(propVal);
            else
                propVal = parseFloat(propVal);
        }

        return propVal;        
    }

    static setPropertyByPath(obj, path, val) {
        path.split('.').forEach((key, i, arr) => {
            if (i == arr.length - 1) {
                obj[key] = val;
                return;
            }

            if (typeof obj[key] == 'undefined')
                obj[key] = {};

            obj = obj[key];
        });
    }

    static getPropertyByPath(obj, path) {
        let error = path.split('.').some((key, i, arr) => {
            obj = obj[key];

            if (typeof obj == 'undefined') {
                console.log("ERROR: Couldn't find value.")
                return true;
            }

            return false;
        });

        if (!error) return obj;
    }

    // https://stackoverflow.com/a/1186309
    static objectifyForm(formArray) {
        var returnArray = {};
        for (var i = 0; i < formArray.length; i++)
           returnArray[formArray[i]['name']] = formArray[i]['value'];

        return returnArray;
    }

    // https://stackoverflow.com/a/895231
    static preventEnterKey() {
        $(window).keydown(function(event){
            if (event.keyCode == 13) {
                event.preventDefault();
                return false;
            }
        });
    }

    static getProps(selector, props) {
        let newProps = {};
        $(selector).each((i, element) => {
            let $element = $(element);
            let propType = $element.prop('type');
            let propVal = LcatDB.Utils.jqValueGet($element);

            if (typeof propVal == 'undefined') return;

            let propName = $element.prop('name');

            if (typeof propName == 'undefined') {
                console.log("ERROR: name is undefined");
                console.log($element);
                return;
            }

            let propPath = newProps;

            this.setPropertyByPath(newProps, propName, propVal);
        });

        $.extend(true, props, newProps);
        return newProps;
    }

    static setProps(selector, props) {
        $(selector).each((i, element) => {
            let $element = $(element);

            let propType = $element.prop('type');

            let propName = $element.prop('name');

            if (typeof propName == 'undefined') {
                console.log("ERROR: name is undefined");
                console.log($element);
                return;
            }

            let propVal = this.getPropertyByPath(props, propName)
            if (typeof propVal == "undefined") return;

            this.jqValueSet($element, propVal);
        });
    }
};

LcatDB.Utils.CallbackChannel = class {
    constructor() {
        this.callbacks = {};
        this.callbackCtr = 0;
    }

    add(callback) {
        this.callbacks[this.callbackCtr] = callback;
        return this.callbackCtr++;
    }

    remove(key) { delete this.callbacks[key] }

    run(status, data) {
        Object.keys(this.callbacks).forEach((key) => {
            this.callbacks[key](status, data);
        });
    }
};


/**
 * Class to create a chain of events.
 * Helps to avoid deep nesting.
 */
LcatDB.Utils.Chain = class {
    /**
     * Create a chain.
     * @param {...function} func
     */
    constructor() {
        this.index = -1;
        this.links = arguments;
        this.pauseAmt = 0;
        this.next();
    }

    /**
     * Prevents next() from proceeding to the next event in the chain amt times
     * 
     * @param {number} [amt=1] 
     */
    pause(amt = 1) { this.pauseAmt += amt; }

    /** Removes any pauses that had been created. */
    resume() {
        this.pauseAmt = 0;
    }

    /**
     * Proceeds to the next event in the chain.
     * 
     * @returns {number} pauseAmt
     * */
    next() {
        if (this.pauseAmt) return --this.pauseAmt;
        
        this.index++;
        this.links[this.index].apply(this, arguments);
        return 0;
    }
};