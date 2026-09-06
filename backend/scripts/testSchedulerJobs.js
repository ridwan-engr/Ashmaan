import connectDatabase from "../config/database.js";

import {
  runAlarmJob,
  runStatisticsJob,
  runDeviceJob,
} from "../services/scheduler/vrmScheduler.js";

const run = async () => {
  try {
    await connectDatabase();

    console.log("\n=== ALARM JOB ===");
    const alarms =
      await runAlarmJob();

    console.log(
      JSON.stringify(
        {
          total:
            alarms?.total,
          successful:
            alarms?.successful,
          failed:
            alarms?.failed,
        },
        null,
        2
      )
    );

    console.log("\n=== STATISTICS JOB ===");
    const statistics =
      await runStatisticsJob();

    console.log(
      JSON.stringify(
        {
          total:
            statistics?.total,
          successful:
            statistics?.successful,
          failed:
            statistics?.failed,
        },
        null,
        2
      )
    );

    console.log("\n=== DEVICE JOB ===");
    const devices =
      await runDeviceJob();

    console.log(
      JSON.stringify(
        {
          total:
            devices?.total,
          successful:
            devices?.successful,
          failed:
            devices?.failed,
        },
        null,
        2
      )
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "Scheduler validation failed:",
      error
    );

    process.exit(1);
  }
};

run();