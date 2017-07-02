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
    return (
        ("0" + time.getUTCHours()).slice(-2) + ':' +
        ("0" + time.getUTCMinutes()).slice(-2) + ':' +
        ("0" + time.getUTCSeconds()).slice(-2) + ' ' +
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