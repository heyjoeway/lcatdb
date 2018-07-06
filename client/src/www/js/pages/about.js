LcatDB.Pages.classes.about = class extends LcatDB.Page {
	init() {
        $("#clearls-btn").click(() =>
            new LcatDB.Modal(
                "Clear Local Storage",
`This will clear all locally stored content, <b>including the Quick Submit username and password,</b> your settings for the Visualize page, and any queued readings. <b>This action cannot be undone.</b> You should only do this if the app is running incorrectly.
<br><br>
<button type="button" class="pull-right btn btn-danger" onclick="window.parent.postMessage('modal.done', '*')">Proceed</button>
<br><br>`,
                () => localStorage.clear(),
                false
            )
        )
	}
}