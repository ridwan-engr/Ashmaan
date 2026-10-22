import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";

import {
  getSiteLoadForecastDssEvidence,
} from "../services/optimizationDss/forecastingDssEvidenceAdapter.js";


dns.setServers([
  "1.1.1.1",
  "1.0.0.1",
]);


async function main() {
  const uri =
    process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI_MISSING"
    );
  }

  const vrmSiteId =
    process.argv[2] ??
    "87666";

  await mongoose.connect(
    uri
  );

  try {
    const evidence =
      await getSiteLoadForecastDssEvidence({
        vrmSiteId,
      });

    console.log(
      JSON.stringify(
        {
          phase:
            evidence.phase,

          layer:
            evidence.layer,

          status:
            evidence.status,

          reason:
            evidence.reason,

          metricName:
            evidence.metricName,

          vrmSiteId:
            evidence.vrmSiteId,

          targetFamily:
            evidence.targetFamily ??
            null,

          targetMetric:
            evidence.targetMetric ??
            null,

          unit:
            evidence.unit,

          window:
            evidence.window,

          valueCount:
            evidence.valueCount ??
            evidence.values?.length ??
            0,

          values:
            evidence.values,

          source:
            evidence.source ??
            null,

          boundaries:
            evidence.boundaries,
        },
        null,
        2
      )
    );
  } finally {
    await mongoose.disconnect();
  }
}


main().catch(error => {
  console.error(
    "\nFORECASTING_DSS_EVIDENCE_FAILED"
  );

  console.error(
    error?.stack ??
    error?.message ??
    String(error)
  );

  process.exitCode = 1;
});
