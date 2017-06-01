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
- The type cannot be editing after the initial creation. This prevents readings from being "corrupted" in the future.
- The type must be fairly basic and generic. (Temperature, depth, pressure, etc.)
- The name, description, and model of the Sensor can be edited at any time, as they are simply human-used descriptors.
- Sensors will have an edit log, like Configurations.
- Sensors will also have an owner. A member system may also be implemented.
- Configurations will hold which Sensors they are associated with.

