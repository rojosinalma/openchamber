import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Window } from 'happy-dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { DesktopSettings } from '@/lib/desktop';

import { I18nProvider } from '@/lib/i18n';
import { useSessionDisplayStore } from '@/stores/useSessionDisplayStore';

// Base UI menus need a layout engine; these stand-ins render the popup inline
// whenever the header holds it open and let the trigger toggle it, so the
// Appearance group can be driven like plain DOM. The context menu is a no-op
// wrapper: it only matters for right-click, which is not under test here.
const MenuContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({ open: false, onOpenChange: () => undefined });
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
  DropdownMenuItem: ({ children, onClick, disabled, className, ...rest }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean; className?: string }>) => (
    <div role="menuitem" aria-disabled={disabled} className={className} onClick={() => { if (!disabled) onClick?.(); }} {...rest}>{children}</div>
  ),
  DropdownMenuLabel: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div data-slot="dropdown-menu-label" className={className}>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));
mock.module('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: React.PropsWithChildren) => <>{children}</>,
  ContextMenuTrigger: ({ children, render }: React.PropsWithChildren<{ render?: React.ReactElement }>) => (render ? React.cloneElement(render, {}, children) : <div>{children}</div>),
  ContextMenuContent: () => null,
  ContextMenuItem: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
const updateCalls: Array<Partial<DesktopSettings>> = [];
const persistenceModule = await import('@/lib/persistence');
mock.module('@/lib/persistence', () => ({
  ...persistenceModule,
  updateDesktopSettings: async (changes: Partial<DesktopSettings>) => {
    updateCalls.push(changes);
    return { ok: true };
  },
}));
const { SessionSidebarActivityHeader } = await import('./sessionSidebarHeaderPresentation');

const reorder = { canMoveUp: true, canMoveDown: true, onMove: () => undefined };

describe('SessionSidebarActivityHeader appearance', () => {
  let windowInstance: Window;
  let host: HTMLDivElement;
  let root: Root;

  const render = async (activityKey: 'pinned' | 'attention' | 'work' | 'chats' | 'projects') => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <SessionSidebarActivityHeader
            activityKey={activityKey}
            collapsed={false}
            forceExpanded={false}
            alwaysShowActions
            onToggle={() => undefined}
            onNewChat={() => undefined}
            reorder={reorder}
          />
        </I18nProvider>,
      );
    });
  };

  const zoneIcon = () => host.querySelector('button[aria-expanded] [data-zone-icon]') as SVGElement | null;
  const openMenu = async () => {
    const trigger = host.querySelector('button[aria-label$="section menu"]') as HTMLButtonElement | null;
    if (!trigger) throw new Error('missing menu trigger');
    await act(async () => { trigger.click(); });
  };
  const swatch = (color: string) => host.querySelector(`[data-zone-color="${color}"]`) as HTMLButtonElement | null;
  const glyph = (icon: string) => host.querySelector(`[data-zone-appearance-icons] [data-zone-icon="${icon}"]`) as HTMLButtonElement | null;
  const resetItem = () => host.querySelector('[data-zone-appearance-reset]') as HTMLElement | null;

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
    useSessionDisplayStore.setState({ sidebarZoneAppearance: {} });
    updateCalls.length = 0;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    await windowInstance.happyDOM.close();
    useSessionDisplayStore.setState({ sidebarZoneAppearance: {} });
  });

  test('a zone paints its default glyph and tint', async () => {
    await render('chats');
    expect(zoneIcon()?.getAttribute('data-zone-icon')).toBe('chat-4');
    expect(zoneIcon()?.getAttribute('style')).toContain('var(--status-success)');
    await render('projects');
    expect(zoneIcon()?.getAttribute('data-zone-icon')).toBe('folders');
    expect(zoneIcon()?.getAttribute('style')).toContain('var(--primary)');
  });

  test('an override renders its icon and tint', async () => {
    useSessionDisplayStore.setState({ sidebarZoneAppearance: { work: { icon: 'rocket', color: 'keyword' } } });
    await render('work');
    expect(zoneIcon()?.getAttribute('data-zone-icon')).toBe('rocket');
    expect(zoneIcon()?.getAttribute('style')).toContain('var(--syntax-keyword)');
  });

  test('the menu keeps Move up/down first, then the Appearance group with the current pick marked', async () => {
    await render('pinned');
    await openMenu();
    const items = Array.from(host.querySelectorAll('[role="menuitem"]')).map((item) => item.textContent?.trim());
    expect(items.slice(0, 2)).toEqual(['Move up', 'Move down']);
    expect(host.querySelector('[data-slot="dropdown-menu-label"]')?.textContent).toBe('Appearance');
    expect(host.querySelectorAll('[data-zone-color]')).toHaveLength(12);
    expect(host.querySelectorAll('[data-zone-appearance-icons] [data-zone-icon]')).toHaveLength(16);
    expect(swatch('warning')?.getAttribute('aria-pressed')).toBe('true');
    expect(swatch('error')?.getAttribute('aria-pressed')).toBe('false');
    expect(glyph('pushpin')?.getAttribute('aria-pressed')).toBe('true');
    expect(resetItem()?.getAttribute('aria-disabled')).toBe('true');
  });

  test('a swatch and a glyph change the header at once, keep the menu open and persist the setting', async () => {
    await render('chats');
    await openMenu();
    await act(async () => { swatch('number')?.click(); });
    expect(useSessionDisplayStore.getState().sidebarZoneAppearance).toEqual({ chats: { color: 'number' } });
    expect(zoneIcon()?.getAttribute('style')).toContain('var(--syntax-number)');
    expect(swatch('number')?.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[role="menu"]')).not.toBeNull();
    await act(async () => { glyph('star')?.click(); });
    expect(useSessionDisplayStore.getState().sidebarZoneAppearance).toEqual({ chats: { icon: 'star', color: 'number' } });
    expect(zoneIcon()?.getAttribute('data-zone-icon')).toBe('star');
    expect(updateCalls).toEqual([
      { sidebarZoneAppearance: { chats: { color: 'number' } } },
      { sidebarZoneAppearance: { chats: { icon: 'star', color: 'number' } } },
    ]);
    expect(resetItem()?.getAttribute('aria-disabled')).toBe('false');
  });

  test('reset clears the zone and leaves the other zones alone', async () => {
    useSessionDisplayStore.setState({ sidebarZoneAppearance: { chats: { icon: 'star' }, work: { color: 'muted' } } });
    await render('chats');
    await openMenu();
    await act(async () => { resetItem()?.click(); });
    expect(useSessionDisplayStore.getState().sidebarZoneAppearance).toEqual({ work: { color: 'muted' } });
    expect(zoneIcon()?.getAttribute('data-zone-icon')).toBe('chat-4');
    expect(updateCalls).toEqual([{ sidebarZoneAppearance: { work: { color: 'muted' } } }]);
  });
});
