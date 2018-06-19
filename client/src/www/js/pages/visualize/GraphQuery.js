class GraphQuery extends Graph {
    static get typeName() { return "Query"; }

    defaultProps() { return {} }

    constructor(data) {
        super(data);
        this.type = "query";
    }

    propsToControls() {
        super.propsToControls();
        $('.graph_typeprefs#query').show();
    }

    getData(callback) {
        this.data = this.sets.map(set => set.propsToQuery());

        callback(this.data);
    }

    createGraph() {
        let $element = $('<pre></pre>', {
            "class": "graph_filter",
            "html": "<code>" + JSON.stringify(this.data, null, '\t') + "</code>"
        });
        return $element;
    }
}