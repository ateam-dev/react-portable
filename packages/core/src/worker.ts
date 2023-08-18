import { unstable_dev, UnstableDevOptions, UnstableDevWorker } from "wrangler";
import { startTunnel } from "untun";

export class Worker {
  private worker: UnstableDevWorker | undefined;
  public globalUrl: string | undefined;

  constructor(
    private readonly workerEntry: string,
    private readonly workerOption: UnstableDevOptions,
  ) {}

  public async start(tunnel = false) {
    this.worker = await unstable_dev(this.workerEntry, this.workerOption);

    if (tunnel) await this.startTunnel();
  }

  public async restart(tunnel = false) {
    await this.worker?.stop();
    this.worker = await unstable_dev(this.workerEntry, {
      ...this.workerOption,
      port: this.worker?.port ?? this.workerOption.port,
    });
  }

  private async startTunnel() {
    const tunnel = await startTunnel({ url: this.localUrl });

    this.globalUrl = await tunnel!.getURL();
  }

  public get localUrl() {
    if (!this.worker) throw new Error(`worker is not up yet.`);

    return `http://${this.worker.address}:${this.worker.port}`;
  }
}
