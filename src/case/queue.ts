// Runs one job per item with a bounded number in flight. Items are started
// in order; a failed job never stops the others. `isCanceled` is checked
// before each start so a cancel skips what has not begun.
export async function runQueue<T>(items: T[], concurrency: number, job: (item: T) => Promise<void>, isCanceled: () => boolean = () => false): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !isCanceled()) {
      const item = items[next++];
      try {
        await job(item);
      } catch {
        // the job reports its own failure through the case state
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
}
