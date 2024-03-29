import { unstable_dev, UnstableDevOptions, UnstableDevWorker } from "wrangler";
import { tunnel } from "cloudflared";

export class Worker {
  public worker: UnstableDevWorker | undefined;
  public globalUrl: string | undefined;

  constructor(
    private readonly workerEntry: string,
    private readonly workerOption: UnstableDevOptions,
  ) {}

  public async start() {
    this.worker = await unstable_dev(this.workerEntry, this.config);
  }

  public async restart() {
    await this.worker?.stop();
    this.worker = await unstable_dev(this.workerEntry, {
      ...this.config,
      port: this.worker?.port ?? this.workerOption.port,
    });
  }

  public async startTunnel(configPath?: string) {
    const { url, connections } = tunnel({
      ...(configPath ? { "--config": configPath, run: null } : {}),
      "--url": this.localUrl,
      "--no-tls-verify": "",
    });

    this.globalUrl = configPath ? "<Your tunnnel domain>" : await url;
  }

  public get localUrl() {
    if (!this.worker) throw new Error(`worker is not up yet.`);

    return `http://${this.worker.address}:${this.worker.port}`;
  }

  private get config(): UnstableDevOptions {
    return {
      compatibilityDate: "2023-07-24",
      logLevel: process.env.DEBUG ? "debug" : "info",
      ...this.workerOption,
      experimental: {
        ...this.workerOption.experimental,
        disableExperimentalWarning: true,
      },
    };
  }
}
