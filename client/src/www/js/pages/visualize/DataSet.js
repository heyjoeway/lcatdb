class DataSet {
    defaultProps() { return {
        "time": {
            "enabled": false,
            "min": 0,
            "max": 0
        },
        "location": {
            "enabled": false,
            "lat": {
                "min": -90,
                "max": 90
            },
            "long": {
                "min": -180,
                "max": 180
            }
        },
        "users": {
            "limit": "all",
            "whitelist": []
        },
        "configurations": {
            "limit": "all",
            "whitelist": []
        },
        "misc": {
            "entries": 0
        }
    } }

    constructor(data) {
        data = data || {};

        this.name = data.name || "N/A";
        this.uid = data.uid || LcatDB.Utils.genUid();

        this.props = this.defaultProps();
        $.extend(
            true, // deep
            this.props, //target
            data.props
        );

        this.callbacks = new LcatDB.Utils.CallbackChannel();
    }

    toJSON() { return {
        "name": this.name,
        "uid": this.uid,
        "props": this.props
    } }

    toString() { return JSON.stringify(this.toJSON()) }

    controlsToProps() {
        let newProps = LcatDB.Utils.getProps('.set-control', this.props);
        this.callbacks.run("DataSet.props");
    }

    propsToControls() {
        LcatDB.Utils.setProps('.set-control', this.props);

        $('.set-control_time').attr(
            'disabled',
            !this.props.time.enabled
        );

        $('.set-control_location').attr(
            'disabled',
            !this.props.location.enabled
        );
    }

    propsToQuery() {
        let filter = [];
        let query = {
            "filter": {
                "$and": filter
            }
        };
        let props = this.props;

        if (props.time.enabled) {
            let timeMax = new Date(props.time.max);
            let timeMin = new Date(props.time.min);

            if (timeMax < timeMin) {
                $.notify({
                    "message": `Error in "${this.name}": Invalid time range.`
                }, {
                    "type": 'error'
                });
                return;
            }
            filter.push({ 
                'timeCreated': {
                    "$lte": timeMax.getTime(),
                    "$gte": timeMin.getTime()
                }
            });
        }

        if (props.location.enabled) {
            filter.push({
                'location.lat': {
                    "$lte": parseFloat(props.location.lat.max),
                    "$gte": parseFloat(props.location.lat.min),
                }
            });

            filter.push({
                'location.long': {
                    "$lte": parseFloat(props.location.long.max),
                    "$gte": parseFloat(props.location.long.min),
                }
            });
        }

        if (props.users.limit != 'all') {
            if (props.users.limit == 'whitelist') {
                let or = [];
                props.users.whitelist.forEach((user) => {
                    or.push({
                        'creator': user
                    });
                });

                if (or.length > 0)
                    filter.push({
                        "$or": or
                    });
            } else {
                query['users'] = props.users.limit;
            }
        }

        if (props.configurations.limit != 'all') {
            if (props.configurations.limit == 'whitelist') {
                let or = [];                
                props.configurations.whitelist.forEach((user) => {
                    or.push({
                        'configuration': user
                    });
                });

                if (or.length > 0)
                    filter.push({
                        "$or": or
                    });
            }
        }

        if (props.misc.entries > 0) {
            query['pageSize'] = props.misc.entries;
            query['page'] = 1;
        }

        return query;
    }

    destroy() {
        this.callbacks.run("DataSet.destroy", {
            set: this
        });
    }
}