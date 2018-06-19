class Graph3d extends Graph {
    static get typeName() { return "3-D Plot"; }

    defaultProps() { return {
        "x": { "var": "location.lat" },
        "y": { "var": "location.long" },
        "z": { "var": "values.depth" },
        "style": { "var": "values.temperature" }
    } }

    constructor(data) {
        super(data);
        this.type = "3d";
    }

    controlsToProps() {
        LcatDB.Utils.getProps('.graph-control-3d', this.props);
    }

    propsToControls() {
        super.propsToControls();
        $('.graph_typeprefs#3d').show();
        LcatDB.Utils.setProps('.graph-control-3d', this.props);
    }

    organizeData(dataRaw) {
        let dataOrganized = [];
        let props = this.props;

        dataRaw.forEach((setRaw, i) => {
            setRaw.forEach((readingRaw) => {
                let readingOrganized = {
                    "group": i
                };

                ['x', 'y', 'z', 'style'].forEach((axis) => {
                    let valueOrganized;

                    let valueVar = props[axis].var;
                    let isValue = valueVar.startsWith('values');
                    if (!isValue) {
                        valueOrganized = LcatDB.Utils.getPropertyByPath(readingRaw, valueVar);
                    } else {
                        let valueType = valueVar.split('.')[1];
                        readingRaw.values.some(value => {
                            if (valueType == value.type) {
                                valueOrganized = value.data[valueType];
                                if ((valueType == "depth") && (axis == 'z'))
                                    valueOrganized = -valueOrganized;
                                return true;
                            }
                            return false;
                        });
                    }

                    if (!isNaN(valueOrganized))
                        valueOrganized = parseFloat(valueOrganized);

                    readingOrganized[axis] = valueOrganized;
                });

                if (typeof readingOrganized.x == 'undefined') return;
                if (typeof readingOrganized.y == 'undefined') return;
                if (typeof readingOrganized.z == 'undefined') return;
                if (typeof readingOrganized.style == 'undefined') return;

                dataOrganized.push(readingOrganized);
            });
        });

        return dataOrganized;
    }

    getData(callback) {
        let props = this.props;
        let fields = { "values": 1 };

        let dataSets = [];

        if (!props.x.var.startsWith('values'))
            fields[props.x.var] = 1;

        if (!props.y.var.startsWith('values'))
            fields[props.y.var] = 1;

        super.getData(dataRaw => {
            this.data = this.organizeData(dataRaw);
            callback(this.data);
        }, fields);
    }

    createGraph() {
        let $element = $('<div></div>');
        $('#output').html($element)
        let container = $element[0];
      
        let dataset = new vis.DataSet(this.data);
        let options = {
            "width": '512px',
            "height": '512px',
            "xLabel": typeNames[this.props.x.var],
            "yLabel": typeNames[this.props.y.var],
            "zLabel": typeNames[this.props.z.var],
            "legendLabel": typeNames[this.props.style.var],
            "showLegend": true,
            "style": 'dot-color'
            // "dataAxis": {
            //     "left": {
            //         "title": {
            //             "text": typeNames[this.props.y.var]
            //         }
            //     }
            // }
        };
        if (this.props.z.var == "values.depth")
            options.zValueLabel = z => -z;

        let graph3d = new vis.Graph3d(container, dataset, options);

        $($element.children()[0]).addClass('visualize-graph-3d');
    }
}