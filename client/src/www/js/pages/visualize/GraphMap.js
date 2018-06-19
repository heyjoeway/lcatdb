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
        let queries = JSURL.stringify(this.data);
        let url ="./embed/map.html?queries=" + queries;
        let $element = $('<iframe></iframe>', {
            "class": "graph_map map-iframe",
            "src": url
        });
        return $element;
    }
}