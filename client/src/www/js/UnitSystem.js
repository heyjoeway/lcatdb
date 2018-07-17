LcatDB.UnitSystem = class {
    /*
     * Initialize elements that use unit normalization.
     */
    static init() {
        let unitSystem = LcatDB.LocalStorage.get("unitSystem", true);
        
        if (!unitSystem) {
            unitSystem = 'imperial';
            LcatDB.LocalStorage.put("unitSystem", 'imperial', true);
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
        if (!system) system = LcatDB.LocalStorage.get("unitSystem", true);

        let $normalize = $('.normalize');
        $normalize.unitnorm('deinit');
        $normalize.each(function() {
            let $this = $(this);
            let currentSystem = $this.data('unitprefsystem');
            if (currentSystem)
                $this.attr('data-unitprefsystem', system);
        });
        $normalize.unitnorm();
        LcatDB.LocalStorage.put("unitSystem", system, true);
        $('#unit-system-picker').val(system);
    }
};