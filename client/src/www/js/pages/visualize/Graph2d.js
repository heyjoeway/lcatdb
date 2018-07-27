import Graph from "./Graph.js";

class Graph2d extends Graph {
    static get typeName() { return "2-D Plot" }

    defaultProps() { return {
        "x": { "var": "timeCreated" },
        "y": { "var": "values.temperature" }
    } }

    constructor(data) {
        super(data);
        this.type = "2d";
    }

    controlsToProps() {
        LcatDB.Utils.getProps('.graph-control-2d', this.props);
    }

    propsToControls() {
        super.propsToControls();
        $('.graph_typeprefs#2d').show();
        LcatDB.Utils.setProps('.graph-control-2d', this.props);
    }

    organizeData(dataRaw) {
        let dataOrganized = [];
        let props = this.props;

        dataRaw.forEach((setRaw, i) => {
            setRaw.forEach(readingRaw => {
                let readingOrganized = { "group": i };

                ['x', 'y'].forEach((axis) => {
                    let valueOrganized;

                    let valueVar = props[axis].var;
                    let isValue = valueVar.startsWith('values');
                    if (!isValue) {
                        valueOrganized = LcatDB.Utils.getPropertyByPath(readingRaw, valueVar);
                    } else {
                        let valueType = valueVar.split('.')[1];
                        readingRaw.values.some((value) => {
                            if (valueType == value.type) {
                                valueOrganized = value.data[valueType];
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

                dataOrganized.push(readingOrganized);
            });
        });

        return dataOrganized;
    }

    getData(callback) {
        let props = this.props;
        let fields = {
            "values": 1
        };

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
        let $element = $('<div></div>', {
            "width": 512,
            "height": 512
        });
        $('#output').html($element)
        let container = $element[0];
      
        let dataset = new vis.DataSet(this.data);
        let options = {
            "legend": true,
            "dataAxis": {
                "left": {
                    "title": {
                        "text": this.getDataTypeNames()[this.props.y.var]
                    }
                }
            }
        };
        let graph2d = new vis.Graph2d(container, dataset, options);
    }
}

export default Graph2d;