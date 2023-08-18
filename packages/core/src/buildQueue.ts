type BuildTask = () => Promise<void>;

export class BuildQueue {
  private queue: BuildTask[] = [];
  private isRunning = false;
  private debounceTimeout?: NodeJS.Timeout;

  async enqueue(task: BuildTask): Promise<void> {
    this.clearQueue();
    this.queue.push(task);

    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => this.runNext(), 500);
  }

  private async runNext(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    const task = this.queue.shift();

    try {
      if (task) await task();
    } catch (error) {
      console.error(error);
    }

    this.isRunning = false;
    if (this.queue.length > 0) setImmediate(() => this.runNext());
  }

  private clearQueue(): void {
    this.queue = [];
  }
}
