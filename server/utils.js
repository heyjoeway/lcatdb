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
    exists &= typeof val == 'undefined';
    exists &= val == '';
    exists &= isNaN(val);
    exists &= val == 0;
    return exists;
}