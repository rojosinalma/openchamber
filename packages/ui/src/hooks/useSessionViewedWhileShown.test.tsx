import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';

import { ChildStoreManager } from '@/sync/child-store';
import { appendNotification, useNotificationStore } from '@/sync/notification-store';
import { createEventRoutingIndex, handleEvent } from '@/sync/sync-context';
import { getRuntimeKey } from '@/lib/runtime-switch';
import { useSessionViewedWhileShown } from './useSessionViewedWhileShown';

const DIRECTORY = '/repo';
const SESSION = 'ses_btw';

const Harness: React.FC<{ directory: string | null; sessionId: string | null; enabled: boolean }> = ({ directory, sessionId, enabled }) => {
  useSessionViewedWhileShown(directory, sessionId, enabled);
  return null;
};

const unseenCount = () => useNotificationStore.getState().sessionUnseenCount(SESSION);

/** An unseen finished turn already recorded for the session. */
const seedUnseenTurn = () => {
  appendNotification({ type: 'turn-complete', directory: DIRECTORY, session: SESSION, time: Date.now(), viewed: false });
};

/** A turn ends now; the sync layer decides whether the user saw it end. */
const finishTurn = (childStores: ChildStoreManager) => {
  handleEvent(DIRECTORY, { type: 'session.idle', properties: { sessionID: SESSION } }, childStores, createEventRoutingIndex(), getRuntimeKey());
};

describe('useSessionViewedWhileShown', () => {
  let windowInstance: Window;
  let host: HTMLDivElement;
  let root: Root;
  let childStores: ChildStoreManager;
  let focused = true;

  const render = (props: { directory?: string | null; sessionId?: string | null; enabled?: boolean } = {}) => act(async () => {
    root.render(React.createElement(Harness, {
      directory: props.directory === undefined ? DIRECTORY : props.directory,
      sessionId: props.sessionId === undefined ? SESSION : props.sessionId,
      enabled: props.enabled ?? true,
    }));
  });

  beforeEach(() => {
    windowInstance = new Window({ url: 'http://localhost/' });
    focused = true;
    // The hook asks the document whether the window is attended; happy-dom
    // always answers focused, so the test owns that answer.
    Object.defineProperty(windowInstance.document, 'hasFocus', { configurable: true, value: () => focused });
    Object.assign(globalThis, {
      window: windowInstance,
      document: windowInstance.document,
      navigator: windowInstance.navigator,
      HTMLElement: windowInstance.HTMLElement,
      Element: windowInstance.Element,
      Node: windowInstance.Node,
      Event: windowInstance.Event,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    childStores = new ChildStoreManager();
    useNotificationStore.setState({ list: [], index: { session: { unseenCount: {}, unseenHasError: {} }, project: { unseenCount: {}, unseenHasError: {} } } });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    childStores.disposeAll();
  });

  test('an attended surface clears the unread marker and records turns that end meanwhile as viewed', async () => {
    seedUnseenTurn();
    expect(unseenCount()).toBe(1);

    await render();
    expect(unseenCount()).toBe(0);

    finishTurn(childStores);
    expect(unseenCount()).toBe(0);
  });

  test('does nothing while disabled', async () => {
    seedUnseenTurn();
    await render({ enabled: false });
    expect(unseenCount()).toBe(1);

    finishTurn(childStores);
    expect(unseenCount()).toBe(2);
  });

  test('an unfocused window stops counting as viewing', async () => {
    await render();
    finishTurn(childStores);
    expect(unseenCount()).toBe(0);

    focused = false;
    await act(async () => {
      windowInstance.dispatchEvent(new windowInstance.Event('blur'));
    });
    finishTurn(childStores);
    expect(unseenCount()).toBe(1);

    focused = true;
    await act(async () => {
      windowInstance.dispatchEvent(new windowInstance.Event('focus'));
    });
    expect(unseenCount()).toBe(0);
    finishTurn(childStores);
    expect(unseenCount()).toBe(0);
  });

  test('a hidden document stops counting as viewing', async () => {
    await render();
    Object.defineProperty(windowInstance.document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => {
      windowInstance.document.dispatchEvent(new windowInstance.Event('visibilitychange'));
    });
    finishTurn(childStores);
    expect(unseenCount()).toBe(1);
  });

  test('unmounting unregisters the session', async () => {
    await render();
    finishTurn(childStores);
    expect(unseenCount()).toBe(0);

    await act(async () => root.unmount());
    root = createRoot(host);
    finishTurn(childStores);
    expect(unseenCount()).toBe(1);
  });
});
