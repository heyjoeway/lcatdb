LcatDB.Pages.classes.register = class extends LcatDB.Page {
    init() {
        $(document).on('submit', 'form', e => {
            e.preventDefault();
            
            LcatDB.InputBlock.start();

			let xhr = new XMLHttpRequest();

			$.ajax({
				url: `${LcatDB.serverUrl}/registerdo`,
				method: 'POST',
                data: $('#form-register').serialize(),
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