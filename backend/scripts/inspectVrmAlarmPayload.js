import {
  getInstallationAlarms,
} from "../services/vrm/alarmService.js";


const VRM_SITE_ID =
  "87666";


function describeValue(
  value,
  depth = 0
) {
  if (depth > 4) {
    return "[MAX_DEPTH]";
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,

      sample:
        value.length > 0
          ? describeValue(
              value[0],
              depth + 1
            )
          : null,
    };
  }

  if (
    typeof value === "object"
  ) {
    const result = {};

    for (
      const [
        key,
        childValue,
      ] of Object.entries(value)
    ) {
      /*
       * Avoid printing obviously sensitive fields
       * if upstream ever includes them.
       */
      if (
        /token|secret|password|authorization|cookie/i.test(
          key
        )
      ) {
        result[key] =
          "[REDACTED]";

        continue;
      }

      result[key] =
        describeValue(
          childValue,
          depth + 1
        );
    }

    return result;
  }

  if (
    typeof value === "string"
  ) {
    return value.length > 200
      ? `${value.slice(0, 200)}…`
      : value;
  }

  return value;
}


async function main() {
  console.log(
    "========================================"
  );

  console.log(
    "VRM ALARM PAYLOAD INSPECTION"
  );

  console.log(
    "========================================"
  );

  console.log(
    `VRM site: ${VRM_SITE_ID}`
  );


  const response =
    await getInstallationAlarms(
      VRM_SITE_ID,
      {
        count: 10,
      }
    );


  console.log(
    "\nTop-level keys:"
  );

  console.log(
    Object.keys(
      response ?? {}
    )
  );


  const alarms =
    Array.isArray(
      response?.alarms
    )
      ? response.alarms
      : Array.isArray(
          response?.data?.alarms
        )
        ? response.data.alarms
        : [];


  console.log(
    `\nAlarm array count: ${alarms.length}`
  );


  if (
    alarms.length === 0
  ) {
    console.log(
      "\nNo alarm entries returned."
    );

    console.log(
      "\nPayload structure:"
    );

    console.dir(
      describeValue(
        response
      ),
      {
        depth: null,
      }
    );

    return;
  }


  console.log(
    "\nFirst alarm entry structure:"
  );

  console.dir(
    describeValue(
      alarms[0]
    ),
    {
      depth: null,
    }
  );


  console.log(
    "\nFirst alarm entry keys:"
  );

  console.log(
    Object.keys(
      alarms[0]
    )
  );
}


main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(
      "Inspection failed:",
      error?.response?.data ??
      error?.message ??
      error
    );

    process.exit(1);
  });