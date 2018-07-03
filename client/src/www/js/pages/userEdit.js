LcatDB.Pages.classes.userEdit = class extends LcatDB.Page {
    init() {
        $(document).on('submit', 'form', e => {
            e.preventDefault();
            
            LcatDB.InputBlock.start();

			let xhr = new XMLHttpRequest();

			$.ajax({
				url: `${LcatDB.serverUrl}/user/editDo`,
				method: 'POST',
                data: $('#form-edit').serialize(),
				dataType: 'html',
				xhr: () => xhr,
				success: (data, status) => {
                    LcatDB.InputBlock.finish();

                    if (status != "success") return;

                    LcatDB.Pages.populateContent(data, xhr.responseURL);
                },
                failure: () => LcatDB.InputBlock.finish()
			});
        });
    }

    deinit() {
        $(document).off('submit', 'form');
    }
};