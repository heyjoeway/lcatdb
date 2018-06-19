LcatDB.UnitSystem = class {
    /*
     * Initialize elements that use unit normalization.
     */
    static init() {
        let unitSystem = localStorage.unitSystem;
        
        if (!unitSystem) {
            unitSystem = 'imperial';
            localStorage["LcatDB.unitSystem"] = 'imperial';
        }
        LcatDB.UnitSystem.change(unitSystem);

        $('#unit-system-picker').change(function() {
            let system = $(this).val();
            LcatDB.UnitSystem.change(system);
        });
    }

    /*
     * Refresh elements that rely on unit normalization.
     */
    static change(system) {
        if (!system) system = localStorage["LcatDB.unitSystem"];

        let $normalize = $('.normalize');
        $normalize.unitnorm('deinit');
        $normalize.each(function() {
            let $this = $(this);
            let currentSystem = $this.data('unitprefsystem');
            if (currentSystem)
                $this.attr('data-unitprefsystem', system);
        });
        $normalize.unitnorm();
        localStorage["LcatDB.unitSystem"] = system;
        $('#unit-system-picker').val(system);
    }
};