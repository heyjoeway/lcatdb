class Utils {
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

    static randomString(size = 32, charSet = "QWERTYUIOPASDFGHJKLZXCVBNM1234567890") {
        let uid = "";
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
        let pathArr;
        if (typeof path == "string")
            pathArr = path.split('.');
        else
            pathArr = path;
        
        pathArr.forEach((key, i, arr) => {
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
        let pathArr;
        if (typeof path == "string")
            pathArr = path.split('.');
        else
            pathArr = path;

        let error = pathArr.some((key, i, arr) => {
            obj = obj[key];
            
            return typeof obj == 'undefined';
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
        $(window).on('keydown.preventEnterKey', function(event){
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
            let propVal = Utils.jqValueGet($element);

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

Utils.CallbackChannel = class {
    clear() {
        this.callbacks = {};
        this.callbackOnceKeys = [];
        this.callbackCtr = 0;
    }

    constructor() { this.clear(); }

    add(callback, once) {
        if (typeof callback != "function") return;
        this.callbacks[this.callbackCtr] = callback;
        if (once) this.callbackOnceKeys.push(this.callbackCtr);
        return this.callbackCtr++;
    }

    remove(key) {
        let onceKeysIndex = this.callbackOnceKeys.indexOf(key);
        if (onceKeysIndex > -1) this.callbackOnceKeys.splice(onceKeysIndex, 1);
        delete this.callbacks[key];
    }

    run(status, data) {
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key](status, data);
            if (this.callbackOnceKeys.indexOf(key) > -1) this.remove(key);
        });
    }
};


/**
 * Class to create a chain of events.
 * Helps to avoid deep nesting.
 */
Utils.Chain = class {
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

export default Utils;