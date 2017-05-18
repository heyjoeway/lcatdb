# Requirements

## Basic Goals

- Record information (detailed in next section) using an extremely streamlined and quick-to-use UI
- Provide an easy to implement API (HTTP REST?) so that development of future clients is quick, easy, and simple
- Develop a database system using MongoDB, complete with sanitization and schema validation
- Develop a web app -> develop webview Android app (w/ extended functionality?) -> develop native android app (-> develop webview iOS app -> develop native iOS app (?))
- Integrate app with physical sensors to further automate process (Fishhawk)
- "Outbox" system: Data can be recorded offline and later published
- Use of data to create depth maps, temperature maps, etc.

## Possible Functionality

- Automatically record data on a set interval
    - Possibly activate manually for a certain amount of time or automatically based on location
    - Batch delete/archive data (to remove accidental entries)

## Misc. Notes

- Will be hosted at champydb.jojudge.com for testing phase, final domain name/server yet to be decided
- Data will be stored in metric units; user will be able to choose between metric and imperial.
    - Worth allowing individual units to be chosen?
- All registered sensors will store their data in one collection 

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
    "time": ((unix timestamp in UTC, also holds date)),
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