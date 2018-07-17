LcatDB.Migrate = class {
    static init() {
        let previousVersion = LcatDB.LocalStorage.get("migrate.version") || '';
        let currentVersion = LcatDB.Platform.version();

        LcatDB.LocalStorage.put("migrate.version", currentVersion);

        let steps = LcatDB.Migrate.getMigrateSteps();
        
        if (previousVersion.localeCompare(currentVersion) == -1) {
            Object.keys(steps).forEach(version => {
                if (version.localeCompare(currentVersion) != 1)
                    steps[version]();
            });
        }
    }

    static getMigrateSteps() { return {
        "2.1.0": () => {
            LcatDB.LocalStorage.put('anon', {
                username: localStorage["anon.username"],
                password: localStorage["anon.password"]
            });

            delete localStorage["anon.username"];
            delete localStorage["anon.password"];
        }
    } }
};