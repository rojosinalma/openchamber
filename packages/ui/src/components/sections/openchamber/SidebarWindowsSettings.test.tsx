import React, { act } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Window } from 'happy-dom';
import type { DesktopSettings } from '@/lib/desktop';

// The DOM has to exist before react-dom loads: it decides at import time whether the
// browser supports `input` events, and without a window it falls back to a keydown
// polyfill that cannot run here. One window for the file, a fresh host per test.
const windowInstance = new Window({ url: 'http://localhost/' });
const previousGlobals = new Map<string, PropertyDescriptor | undefined>();
// SAFETY: the test installs a happy-dom Window for the component and restores the original globals afterward.
for (const [name, value] of Object.entries({
  window: windowInstance,
  document: windowInstance.document,
  navigator: windowInstance.navigator,
  Node: windowInstance.Node,
  Element: windowInstance.Element,
  HTMLElement: windowInstance.HTMLElement,
  HTMLInputElement: windowInstance.HTMLInputElement,
  Event: windowInstance.Event,
  KeyboardEvent: windowInstance.KeyboardEvent,
  MouseEvent: windowInstance.MouseEvent,
  MutationObserver: windowInstance.MutationObserver,
  getComputedStyle: windowInstance.getComputedStyle.bind(windowInstance),
  requestAnimationFrame: windowInstance.requestAnimationFrame.bind(windowInstance),
  cancelAnimationFrame: windowInstance.cancelAnimationFrame.bind(windowInstance),
  IS_REACT_ACT_ENVIRONMENT: true,
})) {
  previousGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}

const updateCalls: Array<Partial<DesktopSettings>> = [];

const persistenceModule = await import('@/lib/persistence');
mock.module('@/lib/persistence', () => ({
  ...persistenceModule,
  updateDesktopSettings: async (changes: Partial<DesktopSettings>) => {
    updateCalls.push(changes);
    return { ok: true };
  },
}));
mock.module('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
mock.module('@/lib/device', () => ({
  useDeviceInfo: () => ({ isMobile: false }),
}));
mock.module('@/components/sections/shared/SettingsInfoHint', () => ({
  SettingsInfoHint: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const { createRoot } = await import('react-dom/client');
type Root = ReturnType<typeof createRoot>;
const { useSessionDisplayStore } = await import('@/stores/useSessionDisplayStore');
const { DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS, SIDEBAR_WINDOW_HOURS_MAX } = await import('@/lib/sidebarTimeWindows');
const { SidebarWindowsSettings } = await import('./SidebarWindowsSettings');

const inputByLabel = (host: HTMLElement, label: string): HTMLInputElement => {
  const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
  if (!input) throw new Error(`missing input ${label}`);
  return input;
};

const typeAndCommit = async (input: HTMLInputElement, text: string) => {
  await act(async () => {
    input.focus();
    // React listens to the native `input` event for onChange; set the value through the
    // tracker-aware setter so it notices the change.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, text);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await act(async () => {
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
};

describe('SidebarWindowsSettings', () => {
  let root: Root;
  let host: HTMLDivElement;

  afterAll(() => {
    windowInstance.close();
    for (const [name, descriptor] of previousGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  });

  beforeEach(() => {
    updateCalls.length = 0;
    useSessionDisplayStore.setState({ sidebarAttentionWindowHours: DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  test('renders the window with its search anchors and current value', async () => {
    useSessionDisplayStore.setState({ sidebarAttentionWindowHours: 96 });
    await act(async () => {
      root.render(<SidebarWindowsSettings />);
    });

    expect(host.querySelector('[data-settings-item="sessions.sidebar-windows"]')).not.toBeNull();
    expect(host.querySelector('[data-settings-item="sessions.sidebar-attention-window"]')).not.toBeNull();
    expect(inputByLabel(host, 'settings.openchamber.sidebarWindows.field.attentionWindowHours').value).toBe('96');
    expect(host.textContent).toContain('settings.openchamber.spaces.idleStop.hours');
  });

  test('commits a typed value on Enter to the store and the persisted settings', async () => {
    await act(async () => {
      root.render(<SidebarWindowsSettings />);
    });

    await typeAndCommit(inputByLabel(host, 'settings.openchamber.sidebarWindows.field.attentionWindowHours'), '72');

    expect(useSessionDisplayStore.getState().sidebarAttentionWindowHours).toBe(72);
    expect(updateCalls).toEqual([{ sidebarAttentionWindowHours: 72 }]);
  });

  test('clamps an out-of-range value to the shared limits', async () => {
    await act(async () => {
      root.render(<SidebarWindowsSettings />);
    });

    await typeAndCommit(inputByLabel(host, 'settings.openchamber.sidebarWindows.field.attentionWindowHours'), '5000');

    expect(useSessionDisplayStore.getState().sidebarAttentionWindowHours).toBe(SIDEBAR_WINDOW_HOURS_MAX);
    expect(updateCalls).toEqual([{ sidebarAttentionWindowHours: SIDEBAR_WINDOW_HOURS_MAX }]);
  });

  test('reset restores the shipped default and is disabled while on it', async () => {
    useSessionDisplayStore.setState({ sidebarAttentionWindowHours: 12 });
    await act(async () => {
      root.render(<SidebarWindowsSettings />);
    });

    const row = host.querySelector('[data-settings-item="sessions.sidebar-attention-window"]');
    const reset = row?.querySelector<HTMLButtonElement>('button[aria-label="settings.common.actions.reset"]');
    if (!reset) throw new Error('missing reset button');
    expect(reset.disabled).toBe(false);

    await act(async () => {
      reset.click();
    });

    expect(useSessionDisplayStore.getState().sidebarAttentionWindowHours).toBe(DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS);
    expect(updateCalls).toEqual([{ sidebarAttentionWindowHours: DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS }]);
    expect(reset.disabled).toBe(true);
  });
});
