# Requirements

## Basic Goals

- Record information (detailed in next section) using an extremely streamlined and quick-to-use UI
- Provide an easy to implement API (HTTP REST?) so that development of future clients is quick, easy, and simple
- Develop a database system using MongoDB, complete with sanitization and schema validation
- Develop a web app -> develop webview Android app (w/ extended functionality?) -> develop native android app (-> develop webview iOS app -> develop native iOS app (?))
- Integrate app with physical sensors to further automate process (Fishhawk)
- "Outbox" system: Data can be recorded offline and later published
- Use of data to create depth maps, temperature maps, etc.
- Export as CSV, JSON
- Repeatable results, proper commenting

## Possible Functionality

- Automatically record data on a set interval
    - Possibly activate manually for a certain amount of time or automatically based on location
    - Batch delete/archive data (to remove accidental entries)

## Misc. Notes

- Will be hosted at champydb.jojudge.com for testing phase, final domain name/server yet to be decided
- Data will be stored in metric units; user will be able to choose between metric and imperial.
    - Worth allowing individual units to be chosen?
- Include Lake Champlain Sea Grant Logo
- Earth and Environmental Science logo
- Addistional info for sensors

## Maps

- 2d: Depth vs Temp
- 2d: Map view (pin of where measurements are taken)
- 3d: Point cloud (depth = y, pos = x + z, temp = color) [last]
- Date limiting
- Graph anomalies per unit of time
- Black/whitelist sensors

## Example Reading

```
sensorReading = {
    "sensor": ((sensor id))
    "creator": ((user id)),
    "publisher": ((user id)),
    "location": {
        "lat": ((latitude, deg)),
        "long": ((longitude, deg)),
        "range" ((radius of possibility with lat/long, m, optional [recommended]))
        "alt": ((altitude above sea level, m, optional)),
        "altRange": ((max possible distance from alt, m, optional))
    },
    "timeCreate": ((unix timestamp in UTC, also holds date)),
    "timeSubmit": ((unix timestamp in UTC, also holds date)),
    "value": ((value))
};

depthValue = {
    "depth": ((depth, m)),
    "depthRange": ((max possible distance from depth, m, optional))
};

tempValue = {
    "temp": ((temp, c)),
    "tempRange": ((max possible distance from temp, c, optional))
};
```