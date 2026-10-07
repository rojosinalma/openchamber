import { describe, expect, test } from 'bun:test';
import type { Session } from '@/lib/opencode/model';
import { isSessionUnseen } from './sessionAttention';

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

// SAFETY: the helper only reads id, parentID and the time block.
const session = (time: Session['time'], overrides: Partial<Session> = {}): Session => ({
  id: 'ses_1',
  title: 'ses_1',
  directory: '/repo',
  time,
  ...overrides,
} as Session);

describe('isSessionUnseen', () => {
  test('a root whose turn finished after it was last viewed is unseen', () => {
    expect(isSessionUnseen(session({ created: 1, updated: 1, idle: NOW - HOUR, viewed: NOW - 2 * HOUR }), NOW)).toBe(true);
  });

  test('never viewed counts as viewed at zero', () => {
    expect(isSessionUnseen(session({ created: 1, updated: 1, idle: NOW - HOUR }), NOW)).toBe(true);
  });

  test('viewed at or after idle is seen', () => {
    expect(isSessionUnseen(session({ created: 1, updated: 1, idle: NOW - HOUR, viewed: NOW - HOUR }), NOW)).toBe(false);
    expect(isSessionUnseen(session({ created: 1, updated: 1, idle: NOW - HOUR, viewed: NOW }), NOW)).toBe(false);
  });

  test('a session that never went idle is not unseen', () => {
    expect(isSessionUnseen(session({ created: 1, updated: 1 }), NOW)).toBe(false);
  });

  test('archived sessions are not unseen', () => {
    expect(isSessionUnseen(session({ created: 1, updated: 1, idle: NOW - HOUR, archived: NOW - HOUR }), NOW)).toBe(false);
  });

  test('subsessions are not unseen on their own', () => {
    expect(isSessionUnseen(session({ created: 1, updated: 1, idle: NOW - HOUR }, { parentID: 'ses_parent' }), NOW)).toBe(false);
  });

  test('an idle older than 48 hours has expired', () => {
    expect(isSessionUnseen(session({ created: 1, updated: 1, idle: NOW - 49 * HOUR }), NOW)).toBe(false);
    expect(isSessionUnseen(session({ created: 1, updated: 1, idle: NOW - 47 * HOUR }), NOW)).toBe(true);
  });
});
