import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { invalidateSettingsFileCache, readMergedSettingsSync } from './settings-files.js';

const preferencesDocument = (fields) => JSON.stringify({
  version: 1,
  fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { value, updatedAt: 1 }])),
});

describe('readMergedSettingsSync cache', () => {
  let tempRoot;
  let settingsFilePath;
  let preferencesFilePath;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-settings-files-'));
    settingsFilePath = path.join(tempRoot, 'settings.json');
    preferencesFilePath = path.join(tempRoot, 'preferences.json');
    fs.writeFileSync(settingsFilePath, JSON.stringify({ publicOrigin: 'https://one.test', fontSize: 10 }));
    fs.writeFileSync(preferencesFilePath, preferencesDocument({ fontSize: 12 }));
  });

  afterEach(() => {
    invalidateSettingsFileCache();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('reads each file once while its stat signature holds', () => {
    const reads = [];
    const trackingFs = {
      statSync: fs.statSync,
      readFileSync: (filePath, encoding) => {
        reads.push(path.basename(filePath));
        return fs.readFileSync(filePath, encoding);
      },
    };

    expect(readMergedSettingsSync({ fs: trackingFs, path, settingsFilePath })).toEqual({ publicOrigin: 'https://one.test', fontSize: 12 });
    expect(readMergedSettingsSync({ fs: trackingFs, path, settingsFilePath })).toEqual({ publicOrigin: 'https://one.test', fontSize: 12 });
    expect(reads).toEqual(['settings.json', 'preferences.json']);
  });

  it('sees a replaced file and an explicit invalidation', () => {
    expect(readMergedSettingsSync({ fs, path, settingsFilePath }).publicOrigin).toBe('https://one.test');

    // Atomic replacement by another process: new inode, new mtime.
    const tmp = `${settingsFilePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ publicOrigin: 'https://two.test' }));
    fs.renameSync(tmp, settingsFilePath);
    expect(readMergedSettingsSync({ fs, path, settingsFilePath }).publicOrigin).toBe('https://two.test');

    const reads = [];
    const trackingFs = {
      statSync: fs.statSync,
      readFileSync: (filePath, encoding) => {
        reads.push(path.basename(filePath));
        return fs.readFileSync(filePath, encoding);
      },
    };
    readMergedSettingsSync({ fs: trackingFs, path, settingsFilePath });
    expect(reads).toEqual([]);
    invalidateSettingsFileCache(settingsFilePath);
    readMergedSettingsSync({ fs: trackingFs, path, settingsFilePath });
    expect(reads).toEqual(['settings.json']);
  });

  it('a missing or unreadable preferences file contributes nothing, and its return is seen', () => {
    fs.rmSync(preferencesFilePath);
    expect(readMergedSettingsSync({ fs, path, settingsFilePath })).toEqual({ publicOrigin: 'https://one.test', fontSize: 10 });
    fs.writeFileSync(preferencesFilePath, 'not json');
    expect(readMergedSettingsSync({ fs, path, settingsFilePath }).fontSize).toBe(10);
    fs.writeFileSync(preferencesFilePath, preferencesDocument({ fontSize: 14 }));
    expect(readMergedSettingsSync({ fs, path, settingsFilePath }).fontSize).toBe(14);
  });
});
