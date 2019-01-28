import Page from "../Page";

export default class extends Page {
	init() {
	    $('.sensor').click(function() {
	        $('#sid').val($(this).attr('id'));
	        $('#form').submit();
	    });
	}
};