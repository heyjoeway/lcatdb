import Graph from "./Graph.js";

class GraphMap extends Graph {
    static get typeName() { return "Map"; }

    defaultProps() { return {} }

    constructor(data) {
        super(data);
        this.type = "map";
    }

    propsToControls() {
        super.propsToControls();
        $('.graph_typeprefs#map').show();
    }

    getData(callback) {
        this.data = this.sets.map(set => set.propsToQuery());

        callback(this.data);
    }

    createGraph() {
        let $element = $('<div></div>', {
            "class": "graph_map map-iframe"
        });
        
        let map = new LcatDB.QueryMap({
            element: $element[0] ,
            queries: this.data
        });

        return $element;
    }
}

export default GraphMap;