const parsePositiveNumber = (
  value,
  fallback
) => {
  const parsed =
    Number(value);

  return (
    Number.isFinite(parsed) &&
    parsed > 0
  )
    ? parsed
    : fallback;
};


const ONLINE_THRESHOLD_MINUTES =
  parsePositiveNumber(
    process.env
      .INSTALLATION_ONLINE_THRESHOLD_MINUTES,
    20
  );


const OFFLINE_THRESHOLD_MINUTES =
  parsePositiveNumber(
    process.env
      .INSTALLATION_OFFLINE_THRESHOLD_MINUTES,
    60
  );


const deriveInstallationStatus = ({
  lastSeenAt,
  syncEnabled = true,
  persistedStatus,
  now = new Date(),
}) => {
  /*
   * Administrative state always wins.
   */
  if (
    syncEnabled === false ||
    persistedStatus === "INACTIVE"
  ) {
    return {
      status: "INACTIVE",
      ageMinutes: null,
    };
  }

  if (!lastSeenAt) {
    return {
      status: "UNKNOWN",
      ageMinutes: null,
    };
  }

  const lastSeen =
    new Date(lastSeenAt);

  const currentTime =
    new Date(now);

  if (
    Number.isNaN(
      lastSeen.getTime()
    ) ||
    Number.isNaN(
      currentTime.getTime()
    )
  ) {
    return {
      status: "UNKNOWN",
      ageMinutes: null,
    };
  }

  const ageMinutes =
    Math.max(
      0,
      (
        currentTime.getTime() -
        lastSeen.getTime()
      ) /
        60000
    );

  if (
    ageMinutes <=
    ONLINE_THRESHOLD_MINUTES
  ) {
    return {
      status: "ONLINE",
      ageMinutes,
    };
  }

  if (
    ageMinutes <=
    OFFLINE_THRESHOLD_MINUTES
  ) {
    return {
      status: "STALE",
      ageMinutes,
    };
  }

  return {
    status: "OFFLINE",
    ageMinutes,
  };
};


export {
  deriveInstallationStatus,
  ONLINE_THRESHOLD_MINUTES,
  OFFLINE_THRESHOLD_MINUTES,
};