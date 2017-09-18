# Decisions

This document will mainly just me rubber-duck debugging the best way to go about certain things. Although, maybe someone will find this useful in the future when they're wondering why I did things the way I did.

## Sensor-Configuration Connection

So, I've thought of two main ways to store sensor information. I'm leaning towards one more than the other for a variety of reasons.

1. Store the sensor data within the configuration itself.
    - Pros
        - Ensures sensors stay together in terms of data relations. (Which is the entire reasoning behind the configuration system.)
        - Less overhead to retrieve information. (One query instead of two.)
    - Cons
        - Difficult to handle the removal of sensors. (What happens to existing readings?)
        - Adding, removing, and editing sensors is a much more clunky.
2. Store all sensors in a collection, and then associate with configurations somehow.
    - Pros
        - Much easier to add, edit, and remove.
        - Sensors can be shared between multiple Configurations, preventing the need to re-register a Sensor separately for each configuration.
        - A Sensor can stay (even in limbo) if it removed from a Configuration. No issues with pre-existing readings.
        - Easier to associate with readings.
    - Cons
        - Requires more overhead to display in the case of Configurations


Additional requirements for sensors:
- The type cannot be edited after the initial creation. This prevents readings from being "corrupted" in the future.
- The type must be fairly basic and generic. (Temperature, depth, pressure, etc.)
- The name, description, and model of the Sensor can be edited at any time, as they are simply human-used descriptors.
- Sensors will have an edit log, like Configurations.
- Sensors will also have an owner. A member system may also be implemented.
- Configurations will hold which Sensors they are associated with. The Sensor will be void of this responsibility.

### Page Flow

1. Access Configuration page.
    - Options to create a new Sensor and to add an existing Sensor.
    - If creating a new Sensor, go to the Sensor addition page.
        - Attach relevant Configuration as a parameter in the URL.
        - Set the type of sensor, then submit.
2. Access the Sensor edit page.
    - Attach relevant Configuration as a parameter in the URL.
    - Can set name, description, and model; submit afterwards.
3. Brought back to the Configuration page.

The Sensor will have a profile that can be viewed, as well. To keep users on path to finish their task efficiently, however, that will be excluded from the Sensor addition page flow.

## URL Structure

- `/`: Home

- `/login`: Login (Page)
- `/loginDo`: Login (Action)

- `/register`: Registration (Page)
- `/registerDo`: Registration (Action) `=> /dashboard`
- `/dashboard`: Dashboard (Page)
- `/logout`: Logout (Action) `=> /dashboard`

- `/configurations/new`: New Configuration (Action) `=> /configurations/{{configuration._id}}/edit`
- `/configurations/{{configuration._id}}`: Configuration (Page)
- `/configurations/{{configuration._id}}/edit`: Configuration Edit (Page)
- `/configurations/{{configuration._id}}/editDo`: Configuration Edit (Action) `=> /configurations/{{configuration._id}}`
- `/configurations/{{configuration._id}}/addSensor`: Add Existing Sensor (Page)
- `/configurations/{{configuration._id}}/addSensorDo`: Add Existing Sensor (Action) `=> /configurations/{{configuration._id}}`

- `/sensors/new[?configuration={{configuration._id}}]`: New Sensor (Page)
- `/sensors/newDo[?configuration={{configuration._id}}]`: New Sensor (Action) `=> /sensors/{{sensor._id}}oid`
- `/sensors/{{sensor._id}}`: Configuration (Page)
- `/sensors/{{sensor._id}}/edit[?configuration={{configuration._id}}]`: Sensor Edit (Page)
- `/sensors/{{sensor._id}}/editDo[?configuration={{configuration._id}}]`: Sensor Edit (Action)
    - Default: `=> /sensors/{{sensor._id}}`
    - `[?configuration={{configuration._id}}]`: `=> /configurations/{{configuration._id}}`

## Sensor Type Management

### Manifest

```
{
    "type": {
        "schema": "SchemaId",
        "provider": "./path/to/js"
        "models": {
            "key": {
                "name": "Human Readable Name",
                "description": "descripton",
                "img": "./path/to/image"
            }
        }
    }
}
```

### Provider

Data needed:
- User: Get preferred format information
- Value: 

```
exports.inputTemplate = function(user, configuration, sensor) { return htmlString };
exports.outputTemplate = function(user, value) { return htmlString };
```


## Internal Practices

7/14/17 - Since I've been feature pushing for a little while, I feel it would be nice to take a step back and revise some messy code that's been thrown about.

### Things I Want to Fix

#### Nesting

So this is something that's become a bit of an unreadable mess:

```
this(param1, param2, (param3, param4) => {
    is(param3, param4, (param5, param6) => {
        not(param5, param6, (param7, param8) => {
            good(param7, param8, ...); // Continue until column 80+
        });
    });
});
```

Yeah. So, this is what I propose:

```
steps(() => {
    next("much", "better");
}, (param1, param2) => {
    next(param1, param2);
}, (param3, param4) => {
    next(param3, param4);
}, (param5, param6) => {
    next(param5, param6);
}, (param7, param8) => {
    next(param7, param8)
}, ...);
```

Much better. Much more readable.

This probably already exists somewhere, but I think I'm probably better off writing a lightweight implementation. I'll throw it in Utils.

OOH, ALSO, LET'S DO THIS

```
thing({
    "user": user,
    "configuration": configuration,
    "etc": ...
})
```

Instead of this:

```
thing(way, too, many, effing, arguments, asdf);
```

Yeah. Do that. K.

When using a context in a chain, modify the context in place.

## Rethinking routing

So, let's split routing processes into a few groups

1. Tests
2. Data
3. Page-specific code

There are a few things to test for:

1. Session (User)
2. Configurations
2. Sensors
4. Readings

These should be able to be layered on top of one another and produce a "data context".

Things each function needs:

1. req
2. res
3. data
4. callback

The callback should pass the first 3 things.

Proposed functions:

1. routeStepUser(req, res, ctx, callback, deps)
    - Sets key "user" in ctx to user data
    