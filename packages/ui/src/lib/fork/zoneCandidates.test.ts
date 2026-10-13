import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import type { Session } from '@/lib/opencode/model';
import { opencodeClient } from '@/lib/opencode/client';
import { switchRuntimeEndpoint } from '@/lib/runtime-switch';
import { ensureChatsRootDirectory, isChatDirectoryPath } from '@/lib/chatDirectories';
import { PROJECT_ICON_MAP } from '@/lib/projectMeta';
import { CHAT_ZONE_PROJECT, canTrackSessionWork, chatZoneProject, chatZoneProjectLabel, isZoneCandidate } from './zoneCandidates';

const CHAT_DIR = '/srv/chats/2026-10-13/session-1';
const PROJECT_DIR = '/repo';

let runtime = 0;
let home = spyOn(opencodeClient, 'getFilesystemHomeInfo');

// SAFETY: the code under test reads parentID, directory and the time block.
const session = (directory: string, overrides: Partial<Session> = {}): Session => ({
  id: 'ses_1',
  title: 'one',
  directory,
  time: { created: 1, updated: 1 },
  ...overrides,
} as Session);

const t = (key: 'sessions.sidebar.activity.chatsTitle') => (key === 'sessions.sidebar.activity.chatsTitle' ? 'Chats' : key);

beforeEach(async () => {
  switchRuntimeEndpoint({ apiBaseUrl: 'https://zones.test', runtimeKey: `zones-${++runtime}` });
  home = spyOn(opencodeClient, 'getFilesystemHomeInfo').mockResolvedValue({ home: '/home/user', chatsRoot: '/srv/chats' });
  await ensureChatsRootDirectory();
});
afterEach(() => { home.mockRestore(); });

describe('zone candidates', () => {
  test('a chat session is a candidate like a project session; children and archived sessions are not', () => {
    expect(isChatDirectoryPath(CHAT_DIR)).toBe(true);
    expect(isZoneCandidate(session(CHAT_DIR))).toBe(true);
    expect(isZoneCandidate(session(PROJECT_DIR))).toBe(true);
    expect(isZoneCandidate(session(CHAT_DIR, { parentID: 'ses_0' }))).toBe(false);
    expect(isZoneCandidate(session(CHAT_DIR, { time: { created: 1, updated: 1, archived: 2 } }))).toBe(false);
  });

  test('Track / Done applies to a chat session under the same rules as a project session', () => {
    const chat = session(CHAT_DIR);
    expect(canTrackSessionWork({ sessionWorkEnabled: true, archivedBucket: false, session: chat })).toBe(true);
    expect(canTrackSessionWork({ sessionWorkEnabled: false, archivedBucket: false, session: chat })).toBe(false);
    expect(canTrackSessionWork({ sessionWorkEnabled: true, archivedBucket: true, session: chat })).toBe(false);
    expect(canTrackSessionWork({ sessionWorkEnabled: true, archivedBucket: false, session: session(CHAT_DIR, { parentID: 'ses_0' }) })).toBe(false);
  });

  test('a chat row in a mixed zone stands in the chats mark and the Chats label; other rows get nothing', () => {
    expect(chatZoneProject('timeline-mixed', CHAT_DIR)).toBe(CHAT_ZONE_PROJECT);
    expect(chatZoneProjectLabel('timeline-mixed', CHAT_DIR, t)).toBe('Chats');
    expect(chatZoneProject('timeline-mixed', PROJECT_DIR)).toBeNull();
    expect(chatZoneProjectLabel('timeline-mixed', PROJECT_DIR, t)).toBeNull();
    expect(chatZoneProject('timeline-chat', CHAT_DIR)).toBeNull();
    expect(chatZoneProjectLabel('timeline-chat', CHAT_DIR, t)).toBeNull();
    expect(chatZoneProject('project', CHAT_DIR)).toBeNull();
  });

  test('the chats mark paints with a registered project icon', () => {
    expect(PROJECT_ICON_MAP[CHAT_ZONE_PROJECT.icon]).toBe('chat-4');
  });
});
