import { afterEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';

import type { Session } from '@/lib/opencode/model';
import { useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { replaceGlobalSessionStatusById } from './global-session-status';
import {
  countRunningSessions,
  orderSubagentRows,
  selectSessionChildIds,
  useRunningSessionCount,
  useSessionChildIds,
} from './session-children';

const session = (id: string, parentID?: string, created = 1): Session => ({
  id, parentID, projectID: 'project', directory: '/repo', title: id, cost: 0,
  time: { created, updated: created },
  tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
});

const resetStores = () => {
  useGlobalSessionsStore.getState().resetForRuntimeSwitch();
  replaceGlobalSessionStatusById(new Map());
};

describe('session-children selectors', () => {
  afterEach(resetStores);

  test('the global structure index answers a parent lookup without scanning the list', () => {
    useGlobalSessionsStore.getState().applySnapshot([
      session('ses_root'),
      session('ses_a', 'ses_root'),
      session('ses_b', 'ses_root'),
      session('ses_other'),
      session('ses_c', 'ses_other'),
    ], []);
    const { activeChildrenByParentId } = useGlobalSessionsStore.getState().structure;
    expect([...selectSessionChildIds(activeChildrenByParentId, 'ses_root')].sort()).toEqual(['ses_a', 'ses_b']);
    expect(selectSessionChildIds(activeChildrenByParentId, 'ses_other')).toEqual(['ses_c']);
    expect(selectSessionChildIds(activeChildrenByParentId, 'ses_a')).toHaveLength(0);
    expect(selectSessionChildIds(activeChildrenByParentId, null)).toHaveLength(0);
    // The empty answer is one shared array: a row without children never re-renders for it.
    expect(selectSessionChildIds(activeChildrenByParentId, 'ses_a')).toBe(selectSessionChildIds(activeChildrenByParentId, 'nope'));
  });

  test('archived children leave the index, new ones join it', () => {
    const store = useGlobalSessionsStore.getState();
    store.applySnapshot([session('ses_root'), session('ses_a', 'ses_root')], []);
    store.upsertSession(session('ses_b', 'ses_root', 2));
    expect([...selectSessionChildIds(useGlobalSessionsStore.getState().structure.activeChildrenByParentId, 'ses_root')].sort()).toEqual(['ses_a', 'ses_b']);
    store.archiveSessions(['ses_a']);
    expect(selectSessionChildIds(useGlobalSessionsStore.getState().structure.activeChildrenByParentId, 'ses_root')).toEqual(['ses_b']);
  });

  test('countRunningSessions counts only the given ids', () => {
    expect(countRunningSessions(['a', 'b', 'c'], new Set(['b', 'c', 'z']))).toBe(2);
    expect(countRunningSessions([], new Set(['b']))).toBe(0);
  });

  test('orderSubagentRows puts running children first, then newest, and caps the list', () => {
    const children = [
      session('old_done', 'root', 10),
      session('new_done', 'root', 40),
      session('old_running', 'root', 20),
      session('new_running', 'root', 30),
    ];
    const rows = orderSubagentRows(children, new Set(['old_running', 'new_running']), 20);
    expect(rows.map((row) => row.session.id)).toEqual(['new_running', 'old_running', 'new_done', 'old_done']);
    expect(rows.map((row) => row.running)).toEqual([true, true, false, false]);
    expect(orderSubagentRows(children, new Set(), 2).map((row) => row.session.id)).toEqual(['new_done', 'new_running']);
  });
});

describe('session-children hooks', () => {
  let browser: Window;
  let root: Root;
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  const renders: Array<{ ids: readonly string[]; running: number }> = [];

  const Probe = ({ sessionId }: { sessionId: string }) => {
    const ids = useSessionChildIds(sessionId);
    const running = useRunningSessionCount(ids);
    renders.push({ ids, running });
    return null;
  };

  const mount = async (sessionId: string) => {
    browser = new Window({ url: 'http://localhost' });
    for (const [key, value] of Object.entries({ window: browser, document: browser.document, navigator: browser.navigator, HTMLElement: browser.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
      descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, { value, configurable: true });
    }
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(<Probe sessionId={sessionId} />));
  };

  afterEach(async () => {
    await act(async () => root.unmount());
    await browser.happyDOM.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    renders.length = 0;
    resetStores();
  });

  test('the hooks follow store changes and stay quiet otherwise', async () => {
    useGlobalSessionsStore.getState().applySnapshot([session('ses_root'), session('ses_a', 'ses_root')], []);
    await mount('ses_root');
    expect(renders.at(-1)).toEqual({ ids: ['ses_a'], running: 0 });

    // A child starts running: the count follows.
    await act(async () => {
      replaceGlobalSessionStatusById(new Map([['ses_a', { status: { type: 'busy' }, directory: '/repo' }]]));
    });
    expect(renders.at(-1)).toEqual({ ids: ['ses_a'], running: 1 });

    // An unrelated session running changes nothing here.
    const before = renders.length;
    await act(async () => {
      replaceGlobalSessionStatusById(new Map([
        ['ses_a', { status: { type: 'busy' }, directory: '/repo' }],
        ['ses_zzz', { status: { type: 'busy' }, directory: '/repo' }],
      ]));
    });
    expect(renders.length).toBe(before);

    // A new child joins the list.
    await act(async () => {
      useGlobalSessionsStore.getState().upsertSession(session('ses_b', 'ses_root', 2));
    });
    expect([...renders.at(-1)!.ids].sort()).toEqual(['ses_a', 'ses_b']);
  });
});
