class GraphRaw extends Graph {
    static get typeName() { return "Raw"; }

    defaultProps() { return {} }

    constructor(data) {
        super(data);
        this.type = "raw";
    }

    propsToControls() {
        super.propsToControls();
        $('.graph_typeprefs#raw').show();
    }

    createGraph() {
        let $element = $('<pre></pre>', {
            "class": "graph_raw",
            "html": "<code>" + JSON.stringify(this.data, null, '\t') + "</code>"
        });
        return $element;
    }
}