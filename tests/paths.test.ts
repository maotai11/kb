import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveAppPaths } from '../src/shared/paths';

describe('resolveAppPaths', () => {
  it('keeps writable data under appData instead of install directory', () => {
    const appDataRoot = path.join('C:', 'Users', 'tester', 'AppData', 'Roaming');
    const paths = resolveAppPaths(appDataRoot);

    expect(paths.appDataDir).toBe(path.join(appDataRoot, 'firm-tool'));
    expect(paths.dbPath).toBe(path.join(appDataRoot, 'firm-tool', 'data', 'data.sqlite'));
    expect(paths.logsDir).toBe(path.join(appDataRoot, 'firm-tool', 'logs'));
  });
});
