class Graph {
    getDataTypeNames() { return {
        "values.depth": "Depth",
        "values.temperature": "Temperature",
        "timeCreated": "Time Created",
        "location.lat": "Latitude",
        "location.long": "Longitude",
        "location.alt": "Altitude"
    } }

    defaultProps() { return {} }

    constructor(data) {
        if (typeof data != 'undefined')
            this.name = data.name;

        this.props = this.defaultProps();
        $.extend(
            true, // deep
            this.props, // target
            data.props // src
        );

        this.callbacks = new LcatDB.Utils.CallbackChannel();

        this.type = "none";

        this.sets = [];

        let dataSets = data.sets || [];
        dataSets.forEach(set => this.addSet(set));
    }

    toJSON() { return {
        "props": this.props,
        "type": this.type,
        "sets": this.sets.map(set => set.uid),
        "name": this.name
    } }

    addSet(dataSet) {
        dataSet.callbacks.add((status, data) => {
            if (status == "DataSet.destroy")
                this.removeSet(data.set);
        });
        this.sets.push(dataSet);
    }

    getSetIndex(dataSet) {
        let index;
        this.sets.some((dataSetIn, i) => {
            if (dataSet === dataSetIn) {
                index = i;
                return true;
            }
        });
        return index;
    }

    removeSet(dataSet) {
        let i;
        if (typeof dataSet == 'number') i = dataSet;
        else i = this.getSetIndex(dataSet);

        this.sets.splice(i, 1);

        this.callbacks.run("Graph.removeSet");
    }

    propsToControls() { $('.graph_typeprefs').hide(); }
  
    destroy() { }

    getData(callback, fields) {
        this.data = [];
        let setsLeft = this.sets.length + 1;

        let gotData = data => {
            if (data) this.data.push(data);
            setsLeft--;
            if (setsLeft == 0) callback(this.data);
        };

        gotData();

        this.sets.forEach(set => {
            let query = set.propsToQuery();

            $.post(`${LcatDB.serverUrl}/api/readings`, query, (data, status) => {
                if (status == 'success') gotData(data);
            });
        });
    }

    createGraph() { return 'Not implemented.' }
}