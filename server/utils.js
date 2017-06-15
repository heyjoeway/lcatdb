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