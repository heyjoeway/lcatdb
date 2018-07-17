LcatDB.Pages.classes.about = class extends LcatDB.Page {
	init() {
        $("#clearls-btn").click(() =>
            new LcatDB.Modal(
                "Clear Local Storage",
`This will clear all locally stored content, <b>including the Quick Submit username and password,</b> all settings for the Visualize page, and any queued readings. <b>This action cannot be undone, and applies to all users' local LcatDB content in this browser.</b> You should only do this if the app is running incorrectly.
<br><br>
<button type="button" class="pull-right btn btn-danger" onclick="window.parent.postMessage('modal.done', '*')">Proceed</button>
<br><br>`,
                () => LcatDB.LocalStorage.deleteAll(),
                false
            )
        )
	}
}