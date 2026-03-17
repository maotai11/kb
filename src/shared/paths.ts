import os from 'node:os';
import path from 'node:path';

export type AppPaths = {
  appDataDir: string;
  dataDir: string;
  cacheDir: string;
  logsDir: string;
  tempDir: string;
  dbPath: string;
  manifestPath: string;
};

const APP_FOLDER = 'firm-tool';

export function resolveAppPaths(platformAppData?: string): AppPaths {
  const appDataRoot = platformAppData ?? path.join(os.homedir(), 'AppData', 'Roaming');
  const appDataDir = path.join(appDataRoot, APP_FOLDER);
  const dataDir = path.join(appDataDir, 'data');
  const cacheDir = path.join(appDataDir, 'cache');
  const logsDir = path.join(appDataDir, 'logs');
  const tempDir = path.join(appDataDir, 'temp');

  return {
    appDataDir,
    dataDir,
    cacheDir,
    logsDir,
    tempDir,
    dbPath: path.join(dataDir, 'data.sqlite'),
    manifestPath: path.join(dataDir, 'data_manifest.json')
  };
}
