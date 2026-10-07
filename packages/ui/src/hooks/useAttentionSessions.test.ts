import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import type { Session } from '@/lib/opencode/model';
import { compact } from '@/lib/opencode/model';
import { useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { useSessionDisplayStore } from '@/stores/useSessionDisplayStore';
import { captureAttentionSticky, clearAttentionSticky, useAttentionStickyStore, type AttentionSticky } from '@/sync/attention-sticky';
import { useSessionUIStore } from '@/sync/session-ui-store';
import { deriveAttentionEntries, useAttentionSessions } from './useAttentionSessions';

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const EMPTY_IDS: ReadonlySet<string> = new Set();

// SAFETY: the code under test reads id, parentID, directory and the time block.
const session = (id: string, time: Session['time'], overrides: Partial<Session> = {}): Session => ({
  id,
  title: id,
  directory: '/repo',
  time,
  ...overrides,
} as Session);

/** A root whose last turn ended an hour before `now` and was never viewed. */
const unseen = (id: string, now = NOW): Session => session(id, { created: 1, updated: 1, idle: now - HOUR });
/** The same record after its view was recorded. */
const viewed = (record: Session): Session => ({ ...record, time: compact({ ...record.time, viewed: record.time.idle }) });

const STICKY_1 = { sessionId: 'ses_1', directory: '/repo', idle: NOW - HOUR };

const derive = (sessions: readonly Session[], sticky: AttentionSticky | null, activeSessionIds: ReadonlySet<string> = EMPTY_IDS) => deriveAttentionEntries({
  bySession: new Map(),
  activeSessions: sessions.filter((entry) => !entry.time.archived),
  entityById: new Map(sessions.map((entry) => [entry.id, entry])),
  activeSessionIds,
  shellSessionIds: EMPTY_IDS,
  now: NOW,
  sticky,
});

const ids = (entries: readonly { sessionId: string }[]) => entries.map((entry) => entry.sessionId);

const loadGlobal = (active: Session[], archived: Session[] = []) => {
  useGlobalSessionsStore.getState().applySnapshot(active, archived);
};

beforeEach(() => {
  clearAttentionSticky();
  loadGlobal([]);
});

describe('deriveAttentionEntries with a sticky session', () => {
  test('lists the sticky session as unseen after its view was recorded', () => {
    const record = viewed(unseen('ses_1'));
    expect(ids(derive([record], null))).toEqual([]);
    const entries = derive([record], STICKY_1);
    expect(entries).toEqual([{ sessionId: 'ses_1', directory: '/repo', kind: 'unseen', at: NOW - HOUR }]);
  });

  test('does not duplicate a session the stamps already list', () => {
    expect(ids(derive([unseen('ses_1')], STICKY_1))).toEqual(['ses_1']);
  });

  test('drops the sticky session once it is archived or gone', () => {
    const archived = session('ses_1', { created: 1, updated: 1, idle: NOW - HOUR, viewed: NOW - HOUR, archived: NOW });
    expect(ids(derive([archived], STICKY_1))).toEqual([]);
    expect(ids(derive([], STICKY_1))).toEqual([]);
  });

  test('stops applying once a newer turn runs or ends in the same session', () => {
    const record = viewed(unseen('ses_1'));
    expect(ids(derive([record], STICKY_1, new Set(['ses_1'])))).toEqual([]);
    const later = viewed(session('ses_1', { created: 1, updated: 1, idle: NOW - HOUR / 2 }));
    expect(ids(derive([later], STICKY_1))).toEqual([]);
  });
});

describe('captureAttentionSticky', () => {
  test('records a session listed as unseen at selection time', () => {
    loadGlobal([unseen('ses_1')]);
    captureAttentionSticky('ses_1', null, NOW);
    expect(useAttentionStickyStore.getState().sticky).toEqual(STICKY_1);
  });

  test('ignores a session that is not unseen', () => {
    loadGlobal([viewed(unseen('ses_1'))]);
    captureAttentionSticky('ses_1', null, NOW);
    expect(useAttentionStickyStore.getState().sticky).toBeNull();
  });

  test('keeps the sticky session when the same session is selected again', () => {
    loadGlobal([unseen('ses_1')]);
    captureAttentionSticky('ses_1', null, NOW);
    loadGlobal([viewed(unseen('ses_1'))]);
    captureAttentionSticky('ses_1', 'ses_1', NOW);
    expect(useAttentionStickyStore.getState().sticky?.sessionId).toBe('ses_1');
  });

  test('releases on a different selection and does not re-add after switching back', () => {
    const first = unseen('ses_1');
    const second = viewed(unseen('ses_2'));
    loadGlobal([first, second]);
    captureAttentionSticky('ses_1', null, NOW);
    loadGlobal([viewed(first), second]);
    captureAttentionSticky('ses_2', 'ses_1', NOW);
    expect(useAttentionStickyStore.getState().sticky).toBeNull();
    captureAttentionSticky('ses_1', 'ses_2', NOW);
    expect(useAttentionStickyStore.getState().sticky).toBeNull();
  });

  test('releases when the selection goes to a draft or the zone is turned off', () => {
    loadGlobal([unseen('ses_1')]);
    captureAttentionSticky('ses_1', null, NOW);
    captureAttentionSticky(null, 'ses_1', NOW);
    expect(useAttentionStickyStore.getState().sticky).toBeNull();

    captureAttentionSticky('ses_1', null, NOW);
    useSessionDisplayStore.setState({ showAttentionSection: true });
    useSessionDisplayStore.setState({ showAttentionSection: false });
    expect(useAttentionStickyStore.getState().sticky).toBeNull();
  });
});

describe('useAttentionSessions', () => {
  const dom = new Window({ url: 'http://attention.test' });
  const originals = new Map<string, PropertyDescriptor | undefined>();

  beforeEach(() => {
    for (const [name, value] of Object.entries({
      window: dom, document: dom.document, localStorage: dom.localStorage,
      Element: dom.Element, HTMLElement: dom.HTMLElement, Node: dom.Node,
      CustomEvent: dom.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true,
    })) {
      originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
      Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    }
  });

  afterEach(() => {
    useSessionUIStore.setState({ currentSessionId: null });
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  });

  test('keeps the selected row while it is current and releases it when the selection moves', async () => {
    // The hook reads the wall clock, so the stamps must sit inside its window.
    const first = unseen('ses_1', Date.now());
    loadGlobal([first, viewed(unseen('ses_2', Date.now()))]);
    let seen: readonly string[] = [];
    const Harness = () => { seen = ids(useAttentionSessions()); return null; };
    const root = createRoot(document.createElement('div'));
    try {
      await act(async () => root.render(React.createElement(Harness)));
      expect(seen).toEqual(['ses_1']);

      // Selecting ses_1: capture, then the optimistic viewed patch, as setCurrentSession does.
      await act(async () => {
        captureAttentionSticky('ses_1', null, NOW);
        useSessionUIStore.setState({ currentSessionId: 'ses_1' });
        useGlobalSessionsStore.getState().upsertSession(viewed(first));
      });
      expect(seen).toEqual(['ses_1']);

      await act(async () => {
        captureAttentionSticky('ses_2', 'ses_1', NOW);
        useSessionUIStore.setState({ currentSessionId: 'ses_2' });
      });
      expect(seen).toEqual([]);

      await act(async () => {
        captureAttentionSticky('ses_1', 'ses_2', NOW);
        useSessionUIStore.setState({ currentSessionId: 'ses_1' });
      });
      expect(seen).toEqual([]);
    } finally {
      await act(async () => root.unmount());
    }
  });
});
