import {
  syncInstallations,
} from "./installationSyncService.js";

import {
  syncDevices,
} from "./deviceSyncService.js";


const runVrmSync = async () => {
  const startedAt =
    new Date();

  console.log(
    "----------------------------------------"
  );
  console.log(
    "VRM Synchronization Started"
  );
  console.log(
    `Started: ${startedAt.toISOString()}`
  );
  console.log(
    "----------------------------------------"
  );

  /*
   * Step 1:
   * Synchronize installations first.
   */
  const installations =
    await syncInstallations();

  /*
   * Step 2:
   * Device discovery depends on
   * persisted installations.
   */
  const devices =
    await syncDevices();

  const completedAt =
    new Date();

  const result = {
    success:
      installations.failed === 0 &&
      devices.failed === 0,

    startedAt,

    completedAt,

    durationMs:
      completedAt.getTime() -
      startedAt.getTime(),

    installations,

    devices,
  };

  console.log(
    "Installation Sync"
  );
  console.log(
    `Received: ${installations.received}`
  );
  console.log(
    `Created: ${installations.created}`
  );
  console.log(
    `Updated: ${installations.updated}`
  );
  console.log(
    `Failed: ${installations.failed}`
  );

  console.log(
    "----------------------------------------"
  );

  console.log(
    "Device Sync"
  );
  console.log(
    `Installations: ${devices.installations}`
  );
  console.log(
    `Processed: ${devices.processedInstallations}`
  );
  console.log(
    `Diagnostic records: ${devices.receivedRecords}`
  );
  console.log(
    `Devices discovered: ${devices.discovered}`
  );
  console.log(
    `Created: ${devices.created}`
  );
  console.log(
    `Updated: ${devices.updated}`
  );
  console.log(
    `Skipped: ${devices.skipped}`
  );
  console.log(
    `Failed: ${devices.failed}`
  );

  console.log(
    "----------------------------------------"
  );

  console.log(
    "VRM Synchronization Completed"
  );
  console.log(
    `Duration: ${result.durationMs} ms`
  );
  console.log(
    "----------------------------------------"
  );

  return result;
};

export {
  runVrmSync,
};