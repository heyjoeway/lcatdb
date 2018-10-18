LcatDB.Pages.classes.about = class extends LcatDB.Page {
	init() {
        $("#clearls-btn").click(() => new LcatDB.Modal({
            title: "Clear Local Storage",
            body: `This will clear all locally stored content, <b>including the Quick Submit username and password,</b> all settings for the Visualize page, and any queued readings. 
<b>This action cannot be undone, and applies to all users' local LcatDB content in this browser.</b> 
You should only do this if the app is running incorrectly.`,
            callback: () => LcatDB.LocalStorage.deleteAll(),
            buttons: [{
                text: "Cancel"
            }, {
                text: "Proceed",
                type: "danger",
                action: modal => modal.done()
            }]
        }));
	}
}