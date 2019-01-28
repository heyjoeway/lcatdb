import PageForm from "./PageForm";

let PageClasses = {
    configurationAddSensor:         require("./pages/configurationAddSensor.js").default,
    configurationAddSensorModal:    require("./pages/configurationAddSensorModal.js").default,
    configurationRemoveSensorModal: require("./pages/configurationRemoveSensorModal.js").default,
    configurationTutorial:          require("./pages/configurationTutorial.js").default,
    home:                           require("./pages/home.js").default,
    login:                          require("./pages/login.js").default,
    loginModal:                     require("./pages/loginModal.js").default,
    newReading:                     require("./pages/newReading.js").default,
    quickJoin:                      require("./pages/quickJoin.js").default,
    sensorNewModal:                 require("./pages/sensorNewModal.js").default,
    visualize:                      require("./pages/visualize.js").default,
    about:                          require("./pages/about.js").default,
    queue:                          require("./pages/queue.js").default,
    dashboard:                      require("./pages/dashboard.js").default,
    startup:                        require("./pages/startup.js").default, // Used for cordova builds
    register:                       PageForm,
    forgot:                         PageForm,
    forgotReq:                      PageForm,
    userEdit:                       PageForm,
    configurationEdit:              PageForm,
    sensorEdit:                     PageForm,
    sensorNe:                       PageForm
};

export default PageClasses;