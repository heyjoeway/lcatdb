import AppStorage from "./AppStorage";
import Platform from "./Platform";

class Migrate {
    static init() {
        let previousVersion = AppStorage.get("migrate.version") || '';
        let currentVersion = Platform.version;

        AppStorage.put("migrate.version", currentVersion);

        let steps = Migrate.migrateSteps;
        
        if (previousVersion.localeCompare(currentVersion) == -1) {
            Object.keys(steps).forEach(version => {
                if (version.localeCompare(currentVersion) != 1)
                    steps[version]();
            });
        }
    }

    static get migrateSteps() { return {
        "2.1.0": () => {
            AppStorage.put('anon', {
                username: localStorage["anon.username"],
                password: localStorage["anon.password"]
            });

            delete localStorage["anon.username"];
            delete localStorage["anon.password"];
        }
    } }
}

export default Migrate;