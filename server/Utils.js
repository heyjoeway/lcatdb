const ObjectId = require('mongodb').ObjectId;

// ---- Typedefs for JSDoc

/**
 * Generic error object.
 * @typedef {object} error
 * @property {string} errorName Generic descriptor for error.
 * @property {string} errorNameFull Provides location for module, function, and errorName.
 * @property {object} errorData Contains misc. info regarding the error.
 */

/**
 * MongoDB ObjectID object.
 * @typedef {object} ObjectId
 */

/**
 * Callback that provides either true or false for success.
 * @callback boolCallback
 * @param {boolean} success 
 */

/**
 * Generic success callback.
 * @callback genericSuccess
 */

/**
 * Generic failure callback.
 * @callback genericFailure
 * @param {error} error 
 */


class Utils {
    /**
     * Success callback for Utils.testOid
     * @callback utilsTestOidSuccess
     * @param {ObjectId} newOid
     */
    /**
     * Tests ObjectId for validity.
     * 
     * @param {(ObjectId|string)} oid
     * @param {genericFailure} failure
     * @param {utilsTestOidSuccess} success
     * @returns {ObjectId}
     */
    static testOid(oid, failure, success) {
        if (typeof oid == 'undefined') return false;

        try {
            let newOid = ObjectId(oid);
            if (success) success(newOid);
            return newOid;
        } catch(e) {
            if (failure) failure({
                "errorName": "testOid",
                "errorNameFull": "Utils.testOid",
                "errorData": {
                    "exception": e,
                    "oid": oid
                }
            });
        }
    }

    /**
     * Convert list of field names to fields object.
     * 
     * @param {string[]} reqs
     * @returns {object}
     */
    static reqsToObj(reqs) {
        if (reqs) {
            let obj = {};
            reqs.forEach(key => {
                obj[key] = 1;
            });
            return obj;
        } else return undefined;
    }
    
    /**
     * Tests if value is undefined, an empty string, an empty array, or is zero.
     * 
     * @param {*} val
     */
    static exists(val) {
        let exists = true;
        exists &= typeof val != 'undefined';
        exists &= val != '';
        exists &= !((typeof val == 'array') && (val.length == 0));
        exists &= val != 0;
        return exists;
    }


    /**
     * Sets value in object in place from dot-separated path.
     * 
     * @param {object} obj
     * @param {string} path
     * @param {*} val
     */
    setPath(obj, path, val) {
        let pathArray = path.split('.');
        let lastCrumb = pathArray.pop();
        pathArray.forEach((crumb) => {
            if (typeof obj[crumb] == 'undefined')
                obj[crumb] = {};
            obj = obj[crumb];
        });
        obj[lastCrumb] = val;
    }
}

/**
 * Class to create a chain of events.
 * Helps to avoid deep nesting.
 */
class Chain {
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
}

Utils.Chain = Chain;

module.exports = Utils;