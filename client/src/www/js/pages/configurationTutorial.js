import Page from "../Page";

export default class extends Page {
    init() {
        let hasTemperature = false;
        let hasDepth = false;

        $('.sensor').each(function() {
            let type = $(this).data('type');
            hasTemperature |= type == "temperature";
            hasDepth |= type == "depth";
        });


        if (hasTemperature && hasDepth) {
            let configurationId = location.pathname.split('/')[2];

            $('#done').removeAttr('disabled').attr(
                'href',
                `/newReading.html?configuration=${configurationId},quick=true`
            );
        }
    }
};