import Graph2d from "./Graph2d.js";
import Graph3d from "./Graph3d.js";
import GraphMap from "./GraphMap.js";
import GraphQuery from "./GraphQuery.js";
import GraphRaw from "./GraphRaw.js";

class GraphManager {
    constructor(dataSetManager) {
        this.graphs = [];
        this.graphCurrent = -1;
        this.nameCounter = 1;
        this.dataSetManager = dataSetManager;
        this.dataSetManager.callbacks.add(this.callback.bind(this));

        this.setsAvailable = [];

        $('.graph-control').change(() => this.controlChange());

        $('.new_graph').click(e => {
            this.newGraph($(e.target).data('type'));
        });

        $('#delete_graph').click(() => this.deleteGraph());

        $('#list_graph').change(() => {
            let setId = parseInt($('#list_graph').val());
            this.switchGraph(setId);
        });

        $('#addset_graph').click(() => this.addSet());
        $('#removeset_graph').click(() => this.removeSets());
        $('#create_graph').click(() => this.createGraph());

        this.load();
    }

    callback(status) { this.updateSets() }

    clear() { while (this.graphs.length) this.removeGraph() }

    getGraphTypeDict() { return {
        "2d": Graph2d,
        "3d": Graph3d,
        "map": GraphMap,
        "raw": GraphRaw,
        "query": GraphQuery
    } }

    populateMenu() {
        let html = '';

        this.graphs.forEach((graph, i) => {
            let selected = (this.graphCurrent == i) ? 'selected' : '';
            html += `<option value="${i}" ${selected}>${graph.name}</option>`;
        });

        $("#list_graph").prop('disabled', html == '');
        if (html == '')
            html = `<option value="" disabled selected hidden>No graphs created.</option>`;

        $("#list_graph").html(html);
    }

    newGraph(type) {
        let graphType = this.getGraphTypeDict()[type];

        this.addGraph(new graphType({
            "name": `Graph ${this.nameCounter++} (${graphType.typeName})`
        }));
        this.switchGraph(this.graphs.length - 1);

        this.store();
    }

    addGraph(graph) {
        this.graphs.push(graph);
        graph.callbacks.add(status => {
            if (status == "Graph.removeSet") {
                this.updateSets();
                this.store();
            }
        });
    }

    switchGraph(i) {
        if (typeof i != 'undefined')
            this.graphCurrent = i;
        
        this.graphCurrent = Math.min(
            this.graphCurrent,
            this.graphs.length - 1
        );

        if (this.graphCurrent == -1) {
            $('#section_graph_properties').hide();
            $('#section_graph_description').show();
            $('#create_graph').attr('disabled', 'true');
        } else {
            $('#section_graph_description').hide();
            $('#section_graph_properties').show();
            $('#create_graph').removeAttr('disabled');
            this.graphs[this.graphCurrent].propsToControls();
        }

        this.populateMenu();
        this.updateSets();

        this.store();
    }

    removeGraph(i) {
        if (this.graphs.length == 0)
            return;
    
        if (typeof i == 'undefined')
            i = this.graphCurrent;
        
        this.graphs[i].destroy();
        this.graphs.splice(i, 1);
    
        if (this.graphCurrent >= this.graphs.length)
            this.graphCurrent = this.graphs.length - 1;

    }

    deleteGraph(i) {
        this.removeGraph(i);
        this.switchGraph();
        this.store();
    }

    updateSets() {
        if (this.graphCurrent == -1) return;

        this.setsCurrent = this.graphs[this.graphCurrent].sets;
        this.setsAvailable = dataSetManager.sets.xor(this.setsCurrent);

        let availableHtml = '';

        this.setsAvailable.forEach((set, i) => {
            let selected = (0 == i) ? 'selected' : '';
            availableHtml += `<option value="${i}" ${selected}>${set.name}</option>`;
        });

        $("#list_setsgraphavail").html(availableHtml);

        let currentHtml = '';

        this.setsCurrent.forEach((set, i) => {
            currentHtml += `<option value="${i}">${set.name}</option>`;
        });

        $("#list_setsgraphcur").html(currentHtml);
    }

    addSet() {
        let i = parseInt($("#list_setsgraphavail").val());
        if (isNaN(i)) return;
        let set = this.setsAvailable[i];
        this.graphs[this.graphCurrent].addSet(set);

        this.updateSets();
        this.store();
    }

    removeSets() {
        $("#list_setsgraphcur").val().forEach((val) => {
            let i = parseInt(val);
            let set = this.setsCurrent[i];
            this.graphs[this.graphCurrent].removeSet(set);
        });

        this.updateSets();
        this.store();
    }

    createGraph() {
        let graphCurrent = this.graphs[this.graphCurrent];
        graphCurrent.getData(() => {
            $('#output').html(graphCurrent.createGraph());
        });
    }

    controlChange(e) {
        this.graphs[this.graphCurrent].controlsToProps();
        this.store();
    }

    toJSON() { return {
        graphs: this.graphs.map(graph => graph.toJSON()),
        nameCounter: this.nameCounter,
        graphCurrent: this.graphCurrent
    } }

    fromJSON(jsonObj) {
        this.clear();

        let graphs = jsonObj.graphs || [];

        graphs.forEach(graph => {
            let graphType = this.getGraphTypeDict()[graph.type];

            this.addGraph(new graphType({
                "props": graph.props,
                "name": graph.name,
                "sets": graph.sets.map(
                    setUid => this.dataSetManager.getSetByUid(setUid)
                )
            }));
        });

        this.nameCounter = jsonObj.nameCounter || 1;
        if (typeof jsonObj.graphCurrent == "undefined")
            this.switchGraph(-1);
        else
            this.switchGraph(jsonObj.graphCurrent);
    }

    store() {
        localStorage["visualize.GraphManager"] = JSON.stringify(this.toJSON());
    }

    load() {
        this.fromJSON(JSON.parse(
            localStorage["visualize.GraphManager"] || "{}"
        ));
    }
}

export default GraphManager;