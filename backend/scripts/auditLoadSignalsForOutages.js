// backend/scripts/auditLoadSignalsForOutages.js

import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import OutageEvent from "../models/OutageEvent.js";
import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";


dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const BEFORE_MINUTES = 30;
const AFTER_MINUTES = 30;

const MAX_VALUES_PER_SIGNAL = 20;
const MAX_EXAMPLES_PER_SIGNAL = 5;


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}


function telemetryValue(record) {
  if (
    record.numericValue !== null &&
    record.numericValue !== undefined
  ) {
    return record.numericValue;
  }

  return record.value;
}


function isCandidateLoadSignal(record) {
  const parameter =
    normalize(
      record.parameter ??
      record.description
    );

  const deviceType =
    normalize(
      record.deviceType
    );

  const combined =
    `${deviceType} ${parameter}`;


  /*
   * Positive candidates.
   *
   * We intentionally keep this fairly broad.
   * The purpose of this audit is discovery,
   * not production classification.
   */

  const positivePatterns = [
    "load",
    "loads",
    "consumption",
    "ac consumption",
    "ac output",
    "ac-out",
    "ac out",
    "acout",
    "output power",
    "output current",
    "output voltage",
  ];


  const hasPositivePattern =
    positivePatterns.some(
      (pattern) =>
        combined.includes(pattern)
    );


  if (!hasPositivePattern) {
    return false;
  }


  /*
   * Remove signals that are clearly source-side
   * rather than served-load/output-side.
   */

  const obviousSourceSidePatterns = [
    "grid meter",
    "pv inverter",
    "solar charger",
    "battery monitor",
    "generator",
    "genset",
  ];


  const clearlySourceSide =
    obviousSourceSidePatterns.some(
      (pattern) =>
        combined.includes(pattern)
    );


  return !clearlySourceSide;
}


function signalKey(record) {
  return [
    record.deviceType ??
      "UNKNOWN",

    record.deviceInstance ??
      "NA",

    record.vrmAttributeId ??
      "NO_ATTRIBUTE",

    record.parameter ??
      record.description ??
      "UNKNOWN",
  ].join("|");
}


/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not defined."
    );
  }


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ASHMAAN OUTAGE LOAD-SIGNAL AUDIT"
  );
  console.log(
    "================================================"
  );


  await mongoose.connect(
    process.env.MONGODB_URI
  );


  console.log(
    "MongoDB connected."
  );


  /*
  |--------------------------------------------------------------------------
  | Load persisted grid interruption events
  |--------------------------------------------------------------------------
  */

  const events =
    await OutageEvent.find({
      eventType:
        "GRID_OUTAGE",

      source:
        "DERIVED",

      detectionMethod:
        "ACTIVE_SOURCE_TRANSITION",
    })
      .sort({
        startTime: 1,
      })
      .lean();


  const installationIds = [
    ...new Set(
      events
        .map(
          (event) =>
            String(
              event.installation
            )
        )
    ),
  ];


  const installations =
    await Installation.find({
      _id: {
        $in:
          installationIds,
      },
    })
      .select({
        _id: 1,
        vrmSiteId: 1,
        name: 1,
      })
      .lean();


  const installationMap =
    new Map(
      installations.map(
        (installation) => [
          String(
            installation._id
          ),
          installation,
        ]
      )
    );


  /*
  |--------------------------------------------------------------------------
  | Fleet-level signal aggregation
  |--------------------------------------------------------------------------
  */

  const fleetSignals =
    new Map();


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "OUTAGE WINDOW SIGNALS"
  );
  console.log(
    "================================================"
  );


  for (
    const event
    of events
  ) {
    const installation =
      installationMap.get(
        String(
          event.installation
        )
      );


    const startTime =
      new Date(
        event.startTime
      );


    /*
     * For restored events:
     * inspect through restoration + 30 minutes.
     *
     * For open events:
     * inspect through current time.
     */

    const eventEnd =
      event.restorationTime
        ? new Date(
            event.restorationTime
          )
        : new Date();


    const from =
      new Date(
        startTime.getTime() -
          BEFORE_MINUTES *
            60 *
            1000
      );


    const to =
      new Date(
        eventEnd.getTime() +
          AFTER_MINUTES *
            60 *
            1000
      );


    const telemetry =
      await Telemetry.find({
        installation:
          event.installation,

        source:
          "VRM",

        timestamp: {
          $gte: from,
          $lte: to,
        },
      })
        .select({
          _id: 1,

          deviceType: 1,
          deviceInstance: 1,

          vrmAttributeId: 1,

          parameter: 1,
          description: 1,

          numericValue: 1,
          value: 1,

          unit: 1,
          quality: 1,
          timestamp: 1,

          raw: 1,
        })
        .lean();


    const candidates =
      telemetry.filter(
        isCandidateLoadSignal
      );


    const perEventSignals =
      new Map();


    for (
      const record
      of candidates
    ) {
      const key =
        signalKey(record);


      if (
        !perEventSignals.has(
          key
        )
      ) {
        perEventSignals.set(
          key,
          {
            key,

            deviceType:
              record.deviceType ??
              null,

            deviceInstance:
              record.deviceInstance ??
              null,

            vrmAttributeId:
              record.vrmAttributeId ??
              null,

            parameter:
              record.parameter ??
              record.description ??
              null,

            descriptions:
              new Set(),

            units:
              new Set(),

            values: [],

            examples: [],
          }
        );
      }


      const signal =
        perEventSignals.get(
          key
        );


      if (
        record.description
      ) {
        signal.descriptions.add(
          record.description
        );
      }


      if (
        record.unit
      ) {
        signal.units.add(
          record.unit
        );
      }


      const value =
        telemetryValue(
          record
        );


      if (
        signal.values.length <
        MAX_VALUES_PER_SIGNAL
      ) {
        signal.values.push(
          value
        );
      }


      if (
        signal.examples.length <
        MAX_EXAMPLES_PER_SIGNAL
      ) {
        signal.examples.push({
          timestamp:
            record.timestamp,

          value,

          unit:
            record.unit ??
            null,

          rawDbusPath:
            record.raw
              ?.dbusPath ??
            null,

          rawCode:
            record.raw
              ?.code ??
            null,

          formattedValue:
            record.raw
              ?.formattedValue ??
            null,
        });
      }


      /*
       * Fleet aggregation
       */

      if (
        !fleetSignals.has(
          key
        )
      ) {
        fleetSignals.set(
          key,
          {
            key,

            deviceType:
              signal.deviceType,

            deviceInstance:
              signal.deviceInstance,

            vrmAttributeId:
              signal.vrmAttributeId,

            parameter:
              signal.parameter,

            sites:
              new Set(),

            events:
              new Set(),

            units:
              new Set(),

            dbusPaths:
              new Set(),

            codes:
              new Set(),
          }
        );
      }


      const fleetSignal =
        fleetSignals.get(
          key
        );


      fleetSignal.sites.add(
        String(
          event.installation
        )
      );


      fleetSignal.events.add(
        String(
          event._id
        )
      );


      if (
        record.unit
      ) {
        fleetSignal.units.add(
          record.unit
        );
      }


      if (
        record.raw
          ?.dbusPath
      ) {
        fleetSignal
          .dbusPaths
          .add(
            record.raw.dbusPath
          );
      }


      if (
        record.raw?.code
      ) {
        fleetSignal
          .codes
          .add(
            record.raw.code
          );
      }
    }


    console.log("");

    console.log(
      `Site: ${installation?.vrmSiteId ?? "--"} | ${installation?.name ?? "--"}`
    );

    console.log(
      `Event: ${event._id}`
    );

    console.log(
      `Start: ${startTime.toISOString()}`
    );

    console.log(
      `Status: ${event.status}`
    );

    console.log(
      `Telemetry records in window: ${telemetry.length}`
    );

    console.log(
      `Candidate load records: ${candidates.length}`
    );

    console.log(
      `Candidate load signals: ${perEventSignals.size}`
    );


    for (
      const signal
      of perEventSignals.values()
    ) {
      console.log("");

      console.log(
        `  Signal: ${signal.key}`
      );

      console.log(
        `  Unit(s): ${JSON.stringify([...signal.units])}`
      );

      console.log(
        `  Values: ${JSON.stringify(signal.values)}`
      );

      console.log(
        "  Examples:"
      );


      for (
        const example
        of signal.examples
      ) {
        console.log(
          `    ${JSON.stringify(example)}`
        );
      }
    }
  }


  /*
  |--------------------------------------------------------------------------
  | Fleet summary
  |--------------------------------------------------------------------------
  */

  console.log("");
  console.log(
    "================================================"
  );

  console.log(
    "FLEET LOAD-SIGNAL SUMMARY"
  );

  console.log(
    "================================================"
  );


  const ranked =
    [...fleetSignals.values()]
      .sort(
        (a, b) =>
          b.events.size -
          a.events.size
      );


  for (
    const signal
    of ranked
  ) {
    console.log("");

    console.log(
      `Signal: ${signal.key}`
    );

    console.log(
      `Device Type: ${signal.deviceType}`
    );

    console.log(
      `Device Instance: ${signal.deviceInstance}`
    );

    console.log(
      `VRM Attribute ID: ${signal.vrmAttributeId}`
    );

    console.log(
      `Parameter: ${signal.parameter}`
    );

    console.log(
      `Event Coverage: ${signal.events.size}/${events.length}`
    );

    console.log(
      `Site Coverage: ${signal.sites.size}/${installationIds.length}`
    );

    console.log(
      `Units: ${JSON.stringify([...signal.units])}`
    );

    console.log(
      `DBus Paths: ${JSON.stringify([...signal.dbusPaths])}`
    );

    console.log(
      `Codes: ${JSON.stringify([...signal.codes])}`
    );
  }


  console.log("");
  console.log(
    "================================================"
  );

  console.log(
    "AUDIT SUMMARY"
  );

  console.log(
    "================================================"
  );


  console.log(
    `Persisted grid events: ${events.length}`
  );

  console.log(
    `Installations represented: ${installationIds.length}`
  );

  console.log(
    `Distinct candidate load signals: ${fleetSignals.size}`
  );

  console.log("");

  console.log(
    "No OutageEvent records were modified."
  );
}


try {
  await run();
} catch (error) {
  console.error("");

  console.error(
    "Load-signal audit failed:"
  );

  console.error(error);

  process.exitCode = 1;
} finally {
  await mongoose.disconnect();

  console.log("");

  console.log(
    "MongoDB disconnected."
  );
}