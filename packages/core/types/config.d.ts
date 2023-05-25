export type Config = {
  /* src directory path */
  src: string;

  /* path of sandbox (Temporary and intermediate files are output here); default: .rp/tmp */
  tmpDir?: string;

  outDirs?: {
    /* Output directory of scripts for client; default: .rp/client */
    client?: string;

    /* Output directory of scripts for server; default: path.resolve(process.pwd(), '.rp/server') */
    server?: string;
  };

  /* path of a script for cloudflare workers; default: ./worker.ts */
  workerScript?: string;
};
