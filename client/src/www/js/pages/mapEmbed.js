LcatDB.Pages.classes.mapEmbed = class extends LcatDB.Page {
    queriesFromObj(queryObj) {
        let query = {
            "fields": {
                "location.lat": 1,
                "location.long": 1
            },
            "filter": {
                "timeCreated": {}
            },
            "sort": [
                ["_id", -1]
            ]
        };

        let readingsMax = parseInt(queryObj.readingsMax);
        if (readingsMax) {
            query.filter.pageSize = readingsMax;
            query.filter.page = 1;
        }

        let timeMin = parseInt(queryObj.timeMin);
        let timeAgo = parseInt(queryObj.timeAgo);
        if (typeof timeAgo != 'undefined') {
            let date = new Date();
            date.setSeconds(date.getSeconds() - timeAgo);
            timeMin = date.getTime();
        }

        if (timeMin || timeMin == 0)
            query.filter.timeCreated['$gte'] = timeMin;

        let timeMax = parseInt(queryObj.timeMax);
        if (timeMax) query.filter.timeCreated['$lte'] = timeMax;

        let id = queryObj.id;
        if (id) query.filter['_id'] = id;

        let configuration = queryObj.configuration;
        if (configuration) query.filter.configuration = configuration;

        let creator = queryObj.creator;
        if (creator) query.filter.creator = creator;

        return [query];
    }

    init() {
        let queries;
        let queryObj = LcatDB.Utils.urlQueryObj(window.location.toString());

        if (queryObj.queries) queries = JSURL.parse(queryObj.queries);
        else queries = this.queriesFromObj(queryObj);

        this.map = new LcatDB.QueryMap({
            selector: 'map',
            queries: queries,
            buoy: queryObj.buoy
        });
    }
};