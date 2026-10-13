import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Window } from 'happy-dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { toast } from '@/components/ui';
import { I18nProvider } from '@/lib/i18n';
import { opencodeClient } from '@/lib/opencode/client';
import type { Session } from '@/lib/opencode/model';
import { useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { useUIStore } from '@/stores/useUIStore';
import { replaceGlobalSessionStatusById } from '@/sync/global-session-status';

// The Base UI menu needs a real layout engine to open; this stand-in renders
// the popup inline whenever the strip holds it open and lets the trigger
// toggle it, so the rows and their buttons can be driven like plain DOM.
const MenuContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({ open: false, onOpenChange: () => undefined });
const toastErrors: string[] = [];
mock.module('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, open, onOpenChange }: React.PropsWithChildren<{ open: boolean; onOpenChange: (open: boolean) => void }>) => (
    <MenuContext.Provider value={{ open, onOpenChange }}>{children}</MenuContext.Provider>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactElement<{ onClick?: () => void }> }) => {
    const menu = React.useContext(MenuContext);
    return React.cloneElement(children, { onClick: () => menu.onOpenChange(!menu.open) });
  },
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => {
    const menu = React.useContext(MenuContext);
    return menu.open ? <div role="menu">{children}</div> : null;
  },
  DropdownMenuItem: ({ children, onSelect, className, ...rest }: React.PropsWithChildren<{ onSelect?: () => void; className?: string; 'aria-label'?: string }>) => (
    <div role="menuitem" className={className} aria-label={rest['aria-label']} onClick={() => onSelect?.()}>{children}</div>
  ),
  DropdownMenuLabel: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));
const { SubagentsStrip } = await import('./SubagentsStrip');

const session = (id: string, parentID?: string, created = 1): Session => ({
  id, parentID, projectID: 'project', directory: '/repo', title: id, cost: 0,
  time: { created, updated: created },
  tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
});

const busy = (...ids: string[]) => new Map(ids.map((id) => [id, { status: { type: 'busy' as const }, directory: '/repo' }]));

describe('SubagentsStrip', () => {
  let windowInstance: Window;
  let host: HTMLDivElement;
  let root: Root;
  let abortSession: ReturnType<typeof spyOn<typeof opencodeClient, 'abortSession'>>;
  let toastError: ReturnType<typeof spyOn<typeof toast, 'error'>>;

  const render = async (sessionId: string | null) => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <SubagentsStrip sessionId={sessionId} directory="/repo" />
        </I18nProvider>,
      );
    });
  };

  const openMenu = async () => {
    const chip = host.querySelector('[data-subagents-chip]') as HTMLButtonElement | null;
    if (!chip) throw new Error('missing chip');
    await act(async () => { chip.click(); });
  };

  const menuItems = () => Array.from(host.querySelectorAll('[role="menuitem"]'));
  const stopButtons = () => Array.from(host.querySelectorAll('[data-subagent-stop]')) as HTMLButtonElement[];
  const stopAllButton = () => host.querySelector('[data-subagents-stop-all]') as HTMLButtonElement | null;

  beforeEach(() => {
    windowInstance = new Window();
    Object.assign(globalThis, {
      window: windowInstance,
      document: windowInstance.document,
      HTMLElement: windowInstance.HTMLElement,
      Element: windowInstance.Element,
      Node: windowInstance.Node,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    useGlobalSessionsStore.getState().applySnapshot([
      session('ses_root'),
      session('ses_a', 'ses_root', 10),
      session('ses_b', 'ses_root', 20),
      session('ses_lonely'),
    ], []);
    replaceGlobalSessionStatusById(new Map());
    abortSession = spyOn(opencodeClient, 'abortSession').mockResolvedValue(true);
    toastErrors.length = 0;
    toastError = spyOn(toast, 'error').mockImplementation((message) => { toastErrors.push(String(message)); return ''; });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    await windowInstance.happyDOM.close();
    abortSession.mockRestore();
    toastError.mockRestore();
    useGlobalSessionsStore.getState().resetForRuntimeSwitch();
    replaceGlobalSessionStatusById(new Map());
  });

  test('a session without children mounts nothing', async () => {
    await render('ses_lonely');
    expect(host.querySelector('[data-subagents-chip]')).toBeNull();
    expect(host.textContent).toBe('');
  });

  test('a draft without a session mounts nothing', async () => {
    await render(null);
    expect(host.querySelector('[data-subagents-chip]')).toBeNull();
  });

  test('children show as a counted chip', async () => {
    await render('ses_root');
    const chip = host.querySelector('[data-subagents-chip]');
    expect(chip?.textContent).toContain('2 subagents');
    expect(chip?.textContent).not.toContain('running');
  });

  test('the chip counts the children still running and follows them', async () => {
    await render('ses_root');
    await act(async () => {
      replaceGlobalSessionStatusById(busy('ses_a'));
    });
    expect(host.querySelector('[data-subagents-chip]')?.textContent).toContain('1 running');
    await act(async () => {
      replaceGlobalSessionStatusById(new Map());
    });
    expect(host.querySelector('[data-subagents-chip]')?.textContent).not.toContain('running');
  });

  test('the chip leaves when the last child is archived', async () => {
    await render('ses_root');
    await act(async () => {
      useGlobalSessionsStore.getState().archiveSessions(['ses_a', 'ses_b']);
    });
    expect(host.querySelector('[data-subagents-chip]')).toBeNull();
  });

  test('a running row carries a stop button, a finished one none', async () => {
    replaceGlobalSessionStatusById(busy('ses_a'));
    await render('ses_root');
    await openMenu();
    const items = menuItems();
    expect(items).toHaveLength(2);
    // Running first: ses_a leads although ses_b was created later.
    expect(items[0]?.getAttribute('aria-label')).toContain('ses_a');
    expect(items[0]?.querySelector('[data-subagent-stop]')).not.toBeNull();
    expect(items[1]?.querySelector('[data-subagent-stop]')).toBeNull();
    expect(stopAllButton()).not.toBeNull();
  });

  test('no stop controls while nothing runs', async () => {
    await render('ses_root');
    await openMenu();
    expect(menuItems()).toHaveLength(2);
    expect(stopButtons()).toHaveLength(0);
    expect(stopAllButton()).toBeNull();
  });

  test('the row stop interrupts that child only and does not open it', async () => {
    replaceGlobalSessionStatusById(busy('ses_a', 'ses_b'));
    // Installed before the render: the strip reads the action out of the store once.
    const openTab = spyOn(useUIStore.getState(), 'openContextPanelTab').mockImplementation(() => undefined);
    await render('ses_root');
    await openMenu();
    try {
      const [first] = stopButtons();
      if (!first) throw new Error('missing stop button');
      await act(async () => { first.click(); });
      expect(abortSession.mock.calls).toEqual([['ses_b', '/repo']]);
      // The click stayed on the button: no side-panel tab, menu still open.
      expect(openTab.mock.calls).toHaveLength(0);
      expect(menuItems()).toHaveLength(2);
      expect(toastErrors).toEqual([]);
      // The row itself still opens the child.
      await act(async () => { (menuItems()[0] as HTMLElement).click(); });
      expect(openTab.mock.calls).toHaveLength(1);
    } finally {
      openTab.mockRestore();
    }
  });

  test('the stop button leaves with the child when the store reports it finished', async () => {
    replaceGlobalSessionStatusById(busy('ses_a'));
    await render('ses_root');
    await openMenu();
    expect(stopButtons()).toHaveLength(1);
    await act(async () => { replaceGlobalSessionStatusById(new Map()); });
    expect(stopButtons()).toHaveLength(0);
    expect(stopAllButton()).toBeNull();
    expect(menuItems()).toHaveLength(2);
  });

  test('a failed row stop reports the child by title', async () => {
    abortSession.mockRejectedValue(new Error('offline'));
    replaceGlobalSessionStatusById(busy('ses_a'));
    await render('ses_root');
    await openMenu();
    await act(async () => { stopButtons()[0]?.click(); });
    expect(toastErrors).toEqual(["Couldn't stop ses_a"]);
  });

  test('stop all interrupts every running child at once and keeps the menu open', async () => {
    useGlobalSessionsStore.getState().applySnapshot([
      session('ses_root'),
      session('ses_a', 'ses_root', 10),
      session('ses_b', 'ses_root', 20),
      session('ses_c', 'ses_root', 30),
    ], []);
    replaceGlobalSessionStatusById(busy('ses_a', 'ses_c'));
    await render('ses_root');
    await openMenu();
    const button = stopAllButton();
    if (!button) throw new Error('missing stop all');
    await act(async () => { button.click(); });
    expect(abortSession.mock.calls.map(([id]) => id).sort()).toEqual(['ses_a', 'ses_c']);
    expect(menuItems()).toHaveLength(3);
    expect(toastErrors).toEqual([]);
  });

  test('stop all toasts once with the number of children it could not stop', async () => {
    abortSession.mockImplementation(async (id: string) => {
      if (id === 'ses_a') throw new Error('offline');
      return true;
    });
    replaceGlobalSessionStatusById(busy('ses_a', 'ses_b'));
    await render('ses_root');
    await openMenu();
    await act(async () => { stopAllButton()?.click(); });
    expect(abortSession.mock.calls).toHaveLength(2);
    expect(toastErrors).toEqual(["Couldn't stop 1 of the subagents"]);
  });
});
