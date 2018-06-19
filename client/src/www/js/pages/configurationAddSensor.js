LcatDB.Pages.classes.configurationAddSensor = class extends LcatDB.Page {
	init() {
	    $('.sensor').click(function() {
	        $('#sid').val($(this).attr('id'));
	        $('#form').submit();
	    });
	}
};