import AppStorage from "./AppStorage";
import UserInfo from "./UserInfo";

class UnitSystem {
    /*
     * Initialize elements that use unit normalization.
     */
    static init() {
        let unitSystem = AppStorage.get("unitSystem", UserInfo.currentUserId);
        
        if (!unitSystem) {
            unitSystem = 'imperial';
            AppStorage.put("unitSystem", 'imperial', UserInfo.currentUserId);
        }
        UnitSystem.change(unitSystem);

        $('#unit-system-picker').change(function() {
            let system = $(this).val();
            UnitSystem.change(system);
        });
    }

    /*
     * Refresh elements that rely on unit normalization.
     */
    static change(system) {
        if (!system) system = AppStorage.get("unitSystem", UserInfo.currentUserId);

        let $normalize = $('.normalize');
        $normalize.unitnorm('deinit');
        $normalize.each(function() {
            let $this = $(this);
            let currentSystem = $this.data('unitprefsystem');
            if (currentSystem)
                $this.attr('data-unitprefsystem', system);
        });
        $normalize.unitnorm();
        AppStorage.put("unitSystem", system, UserInfo.currentUserId);
        $('#unit-system-picker').val(system);
    }
}

export default UnitSystem;