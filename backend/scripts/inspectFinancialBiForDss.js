import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";

import FinancialBiKpiRecord
  from "../models/FinancialBiKpiRecord.js";

dns.setServers([
  "1.1.1.1",
  "1.0.0.1",
]);

async function main() {
  const uri =
    process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI_MISSING");
  }

  await mongoose.connect(uri);

  try {
    const total =
      await FinancialBiKpiRecord.countDocuments({});

    console.log(
      "\n=== FINANCIAL BI RECORD COUNT ==="
    );
    console.log(total);

    const metricNames =
      await FinancialBiKpiRecord.distinct(
        "metricName"
      );

    console.log(
      "\n=== FINANCIAL BI METRIC NAMES ==="
    );
    console.log(
      JSON.stringify(
        metricNames.sort(),
        null,
        2
      )
    );

    const siteRecords =
      await FinancialBiKpiRecord.find({
        "scopeIdentity.vrmSiteId": "87666",
      })
        .sort({
          createdAt: -1,
        })
        .limit(25)
        .lean();

    console.log(
      "\n=== SITE 87666 LATEST KPI RECORDS ==="
    );

    console.log(
      JSON.stringify(
        siteRecords,
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
    "\nFINANCIAL_BI_INSPECTION_FAILED"
  );

  console.error(
    error?.stack ??
    error?.message ??
    String(error)
  );

  process.exitCode = 1;
});
