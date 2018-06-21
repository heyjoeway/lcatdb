import DataSet from "./DataSet.js";

class DataSetManager {
    constructor() {
        this.sets = [];
        this.setCurrent = -1;
        this.nameCounter = 1;

        $('.set-control').change(() => {
            this.controlChange();
        });

        $('#new_set').click(() => {
            this.newSet();
        });

        $('#delete_set').click(() => {
            this.deleteSet();
        });

        $('#list_set').change(() => {
            let setId = parseInt($('#list_set').val());
            this.switchSet(setId);
        });

        this.setUidMap = {};
        this.callbacks = new LcatDB.Utils.CallbackChannel();
        this.load();
    }

    clear() {
        while (this.sets.length)
            this.removeSet();

        this.nameCounter = 1;
    }

    toJSON() { return {
        sets: this.sets.map(set => set.toJSON()),
        nameCounter: this.nameCounter,
        setCurrent: this.setCurrent
    } }

    fromJSON(jsonObj) {
        this.clear();

        let sets = jsonObj.sets || [];

        sets.forEach((setData) => {
            this.addSet(new DataSet(setData));
        });
        this.nameCounter = jsonObj.nameCounter || 1;
        if (typeof jsonObj.setCurrent == "undefined")
            this.switchSet(-1);
        else
            this.switchSet(jsonObj.setCurrent);
    }

    store() {
        localStorage["visualize.DataSetManager"] = JSON.stringify(this.toJSON());
    }

    load() {
        this.fromJSON(JSON.parse(
            localStorage["visualize.DataSetManager"] || "{}"
        ));
    }

    populateMenu() {
        let html = '';

        this.sets.forEach((set, i) => {
            let selected = (this.setCurrent == i) ? 'selected' : '';
            html += `<option value="${i}" ${selected}>${set.name}</option>`;
        });

        $("#list_set").prop('disabled', html == '');
        if (html == '')
            html = `<option value="" disabled selected hidden>No data sets created.</option>`;

        $("#list_set").html(html);
    }

    newSet() {
        let set = new DataSet({
            name: "Set " + (this.nameCounter++)
        });

        this.addSet(set);

        this.callbacks.run("DataSetManager.new");
        this.switchSet(this.sets.length - 1);

        this.store();
    }

    addSet(set) {
        set.callbacks.add(status => {
            this.callbacks.run(status);
        });
        this.sets.push(set);
        if (typeof set.uid != 'undefined')    
           this.setUidMap[set.uid] = set;
    }

    switchSet(i) {
        if (typeof i != 'undefined')
            this.setCurrent = i;
        
        this.setCurrent = Math.min(
            this.setCurrent,
            this.sets.length - 1
        );

        if (this.setCurrent == -1) {
            $('#section_properties').hide();
            $('#section_description').show();
        } else {
            $('#section_properties').show();
            $('#section_description').hide();
            this.sets[this.setCurrent].propsToControls();
        }

        this.populateMenu();

        this.store();
    }

    removeSet(i) {
        if (this.sets.length == 0) return;
    
        if (typeof i == 'undefined')
            i = this.setCurrent;
    
        let set = this.sets[i];
    
        if (typeof set.uid != 'undefined')
            delete this.setUidMap[set.uid];
        this.sets.splice(i, 1);
    
        set.destroy();
    
        if (this.setCurrent >= this.sets.length)
            this.setCurrent = this.sets.length - 1;
    }

    deleteSet(i) {
        this.removeSet(i);
        this.switchSet();
        this.store();
    }

    controlChange(e) {
        this.sets[this.setCurrent].controlsToProps();
        this.store();
    }

    getSetByUid(setUid) {
        return this.setUidMap[setUid];
    }
}

export default DataSetManager;