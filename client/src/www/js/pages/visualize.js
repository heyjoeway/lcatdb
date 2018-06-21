import DataSetManager from "./visualize/DataSetManager.js";
import GraphManager from "./visualize/GraphManager.js";

LcatDB.Pages.classes.visualize = class extends LcatDB.Page {
    init() {
        this.dataSetManager = new DataSetManager();
        this.graphManager = new GraphManager(this.dataSetManager);

        if(!Modernizr.inputtypes['datetime-local']) {
            $('input[type=datetime-local]').datetimepicker({
                "showMeridian": true,
                "format": "yyyy-mm-ddThh:ii",
                "startView": 2,
                "minView": 0,
                "todayBtn": true,
                "todayHighlight": true
            });
        }

        $('input[name="time.enabled"]').change(function() {
            $('.set-control_time').attr(
                'disabled',
                !this.checked
            );
        });

        $('input[name="location.enabled"]').change(function() {
            $('.set-control_location').attr(
                'disabled',
                !this.checked
            );
        });
    }
}