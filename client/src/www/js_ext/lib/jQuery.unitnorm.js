(function($) {
    var types = {
        // "volume": {},
        "length": {
            "name": "Length",
            "suffix": "",
            "base": "meters",
            "units": {
                "meters": {
                    "name": "Meters",
                    "suffix": "m",
                    "from": function(m) { return parseFloat(m); },
                    "to": function(m) { return parseFloat(m); }
                },
                "feet": {
                    "name": "Feet",
                    "suffix": "ft",
                    "from": function(ft) { return parseFloat(ft) * 0.3048; }, // unit -> base
                    "to": function(m) { return parseFloat(m) / 0.3048; }, // base -> unit
                }
            }
        },
        "temperature": {
            "name": "Temperature",
            "suffix": "°",
            "base": "celcius",
            "units": {
                "celcius": {
                    "name": "Celcius",
                    "inputType": "number",
                    "suffix": "C",
                    "from": function(c) { return parseFloat(c); }, // unit -> base
                    "to": function(c) { return parseFloat(c); } // base -> unit
                },
                "farenheit": {
                    "name": "Farenheit",
                    "inputType": "number",
                    "suffix": "F",
                    "from": function(f) { return (parseFloat(f) - 32) * (5.0/9.0); }, // unit -> base 
                    "to": function(c) { return (parseFloat(c) * (9.0/5.0)) + 32; }, // base -> unit
                },
                "kelvin": {
                    "name": "Kelvin",
                    "inputType": "number",
                    "suffix": "K",
                    "from": function(k) { return parseFloat(k) - 273.15; },
                    "to": function (c) { return parseFloat(c) + 273.15; }
                }
            }
        },
        "time": {
            "name": "Time",
            "suffix": "",
            "base": "unix",
            "units": {
                "unix": {
                    "name": "Unix Timestamp (UTC)",
                    "inputType": "number",
                    "from": function(u) { return parseInt(u); },
                    "to": function(u) { return parseInt(u); }
                },
                "iso": {
                    "name": "ISO Timestamp (Local)",
                    "inputType": "datetime-local",
                    "from": function(iso) { // unit (local) -> base (utc)
                        return (new Date(iso)).getTime();
                    },
                    "to": function(u) { // base (utc) -> unit (local)
                        var time = new Date();
                        var isoString = (
                            time.getFullYear() + '-' +
                            ('0' + (time.getMonth() + 1)).slice(-2) + '-' +
                            ('0' + time.getDate()).slice(-2) + 'T' +
                            ('0' + time.getHours()).slice(-2) + ':' +
                            ('0' + time.getMinutes()).slice(-2)
                        );
                        return isoString;
                    }
                }
            }
        },
        // "location": {}
    };

    function toBase(type, unit, val) {
        return types[type].units[unit].from(val);
    }

    function toUnit(type, unit, val) {
        return types[type].units[unit].to(val)
    }

    function convertUnit(type, unitIn, unitOut, val) {
        var base = toBase(type, unitIn, val);
        return toUnit(type, unitOut, base);
    }

    var suppressErrors = 0;

    $.fn.unitnorm = function() {
        // selectors for multiple elements are handled weirdly by jquery
        // have to iterate manually
        if (this.length > 1) {
            return this.each(function() {
                $(this).unitnorm();
            });
        }

        // -----

        // just makes things easier to read
        var $original = this;

        // -----

        // if the original already is normalized, skip (and return clone)
        if (typeof $original.data('unitclone') != 'undefined')
            return $original.data('unitclone');

        // if this is a clone, also skip
        if (typeof $original.data('unitoriginal') != 'undefined')
            return;

        // -----

        // 'unittype' is the type of value represented by the field
        // e.g. temperature, time, mass, etc.
        // see the 'types' variable above for a full list
        var unitType = $original.data('unittype');
        if (typeof unitType == 'undefined') {
            console.log('unitnormalizer: data-unittype not defined.');
            if (suppressErrors < 1) {
                console.log('unitnormalizer: Possible values are:')
                var typeKeys = Object.keys(types);
                for (var i = 0; i < typeKeys.length; i++) {
                    console.log('unitnormalizer:    - ' + typeKeys[i]);
                }
            }
            return;
        }

        // 'unit' is the unit that all values will be converted to for the original field
        // if undefined, will be the base unit for that type (typically metric)
        var originalUnit = $original.data('unit') || types[unitType].base;
        // 'unitpref' is the default unit that the cloned field will be shown with
        // if undefined, defaults to 'unit'
        var unitPref = $original.data('unitpref') || originalUnit;
        // 'unitsavail' are the units that the user will be able to choose from
        // if undefined, defaults to just the preferred unit
        var unitsAvail = $original.data('unitsavail') || unitPref;
        unitsAvail = unitsAvail.split(',');

        // -----

        // clone the input
        var $clone = $original.clone();
        $original.data('unitclone', $clone)
        // give the clone a reference back to the original element
        // used for when the clone's value is changed
        $clone.data('unitoriginal', $original);
        // remvove name so that the clone doesn't get submitted
        $clone.removeAttr('name');
        // also remove id to avoid confusion (!!!!)
        $clone.removeAttr('id');
        // remove unit attribute to avoid confusion
        // (unitPref represents clone's unit)
        $clone.removeAttr('data-unit');

        var cloneUnit = $clone.data('unitpref');
        var newInputType = types[unitType].units[cloneUnit].inputType;
        if (newInputType) $clone.attr('type', newInputType);

        // -----

        // if the original field already has a value, make sure to convert it for the new field 
        $clone.val(convertUnit(
            unitType,
            originalUnit,
            cloneUnit,
            $original.val()
        ));

        // fix min and max values on clone

        var originalMin = $original.attr('min');
        var originalMax = $original.attr('max');

        if (typeof originalMin != 'undefined')
            $clone.attr('min', convertUnit(
                unitType,
                originalUnit,
                cloneUnit,
                originalMin
            ));

        if (typeof originalMax != 'undefined')
            $clone.attr('max', convertUnit(
                unitType,
                originalUnit,
                cloneUnit,
                originalMax
            ));

        // -----

        // if input has a unit description, it needs to be changed
        var unitDesc = $clone.attr('aria-describedby');
        if (typeof unitDesc != undefined) {
            var cloneUnitName = types[unitType].units[cloneUnit].name;
            $('#' + unitDesc).text(cloneUnitName);
        }

        // -----

        // insert clone after original element
        $original.after($clone);
        // hide the original
        $original.hide();

        // here's where the ~M~A~G~I~C~ happens
        $clone.change(function(e) {
            // 'this' now represents the clone
            var $clone = $(this);
            var $original = $clone.data('unitoriginal');

            var unitType = $clone.data('unittype');
            var cloneUnit = $clone.data('unitpref');
            var originalUnit = $original.data('unit');

            $original.val(convertUnit(
                unitType,
                cloneUnit,
                originalUnit,
                $clone.val()
            )).change();
        });
        return true;
    };
}(jQuery));