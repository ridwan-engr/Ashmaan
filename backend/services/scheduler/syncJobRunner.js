const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

const runWithConcurrency = async ({
  items,
  worker,
  concurrency = 2,
  delayBetweenStartsMs = 400,
}) => {
  if (!Array.isArray(items)) {
    throw new Error(
      "runWithConcurrency requires an items array."
    );
  }

  if (typeof worker !== "function") {
    throw new Error(
      "runWithConcurrency requires a worker function."
    );
  }

  const safeConcurrency =
    Math.max(
      1,
      Number(concurrency) || 1
    );

  const results = [];

  let currentIndex = 0;

  const runWorker = async (
    workerId
  ) => {
    while (true) {
      const itemIndex =
        currentIndex++;

      if (
        itemIndex >=
        items.length
      ) {
        break;
      }

      const item =
        items[itemIndex];

      if (
        delayBetweenStartsMs > 0
      ) {
        await sleep(
          delayBetweenStartsMs
        );
      }

      try {
        const result =
          await worker(
            item,
            itemIndex,
            workerId
          );

        results[itemIndex] = {
          success: true,
          item,
          result,
        };
      } catch (error) {
        results[itemIndex] = {
          success: false,
          item,
          error: {
            message:
              error.message,
          },
        };
      }
    }
  };

  const workers =
    Array.from(
      {
        length:
          Math.min(
            safeConcurrency,
            items.length
          ),
      },
      (_, index) =>
        runWorker(index + 1)
    );

  await Promise.all(workers);

  const successful =
    results.filter(
      (entry) =>
        entry?.success
    ).length;

  const failed =
    results.filter(
      (entry) =>
        entry &&
        !entry.success
    ).length;

  return {
    total:
      items.length,

    successful,

    failed,

    results,
  };
};

export {
  runWithConcurrency,
};