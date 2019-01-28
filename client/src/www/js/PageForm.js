import Page from "./Page";
import AppNavigator from "./AppNavigator";

class PageForm extends Page {
    init() {
        // function(e) is required; "this" is the element of the submitted form
        $(document).on('submit', 'form', function(e) {
            e.preventDefault();
            AppNavigator.submitFormAjax($(this));
        });
    }

    deinit() { $(document).off('submit', 'form'); }
}

export default PageForm;