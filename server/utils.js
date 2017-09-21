const ObjectId = require('mongodb').ObjectId;

let months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

exports.prettyTime = function(timeStr, timezone) {
    let time = new Date(timeStr);
    time.setHours(time.getHours() + timezone);

    let hour = time.getUTCHours();
    let am = hour < 12;
    hour = hour % 12 || 12;

    return (
        hour + ':' +
        ("0" + time.getUTCMinutes()).slice(-2) + ':' +
        ("0" + time.getUTCSeconds()).slice(-2) + ' ' +
        (am ? "AM, " : "PM, ") +
        months[time.getUTCMonth()] + ' ' +
        ("0" + time.getUTCDate()).slice(-2) + ', ' +
        time.getUTCFullYear()
    );
};

exports.testOid = function(oid, failure, success) {
    if (oid) {
        try {
            let newOid = ObjectId(oid);
            if (success) success(newOid);
            return newOid;
        } catch(e) {
            if (failure)
                failure({ "type": "Utils.testOid", "exception": e, "oid": oid });
        }
    }
    return false;
};

exports.reqsToObj = function(fields) {
    if (fields) {
        let obj = {};
        fields.forEach((key) => {
            obj[key] = 1;
        });
        return obj;
    } else return undefined;
};

exports.exists = function(val) {
    let exists = true;
    exists &= typeof val != 'undefined';
    exists &= val != '';
    exists &= !((typeof val == 'array') && (val.length == 0));
    exists &= val != 0;
    return exists;
}

class Chain {
    constructor() {
        this.index = -1;
        this.links = arguments;
        this.pauseAmt = 0;
        this.next();
    }

    pause(amt = 1) {
        this.pauseAmt += amt;
    }

    resume() {
        this.pauseAmt = 0;
    }

    next() {
        if (this.pauseAmt) return --this.pauseAmt;
        
        this.index++;
        this.links[this.index].apply(this, arguments);
        return 0;
    }
}

exports.Chain = Chain;

exports.setPath = function(obj, path, val) {
    let pathArray = path.split('.');
    let lastCrumb = pathArray.pop();
    pathArray.forEach((crumb) => {
        if (typeof obj[crumb] == 'undefined')
            obj[crumb] = {};
        obj = obj[crumb];
    });
    obj[lastCrumb] = val;
}