import { afterEach, beforeEach, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import { I18nProvider } from '@/lib/i18n';
import { SessionTimelineRowBody } from './SessionTimelineRowBody';
import { SubagentsRowMarker } from './SubagentsRowMarker';

let browser: Window;
let root: Root;
const descriptors = new Map<string, PropertyDescriptor | undefined>();
beforeEach(() => {
  browser = new Window({ url: 'http://localhost' });
  for (const [key, value] of Object.entries({ window: browser, document: browser.document, navigator: browser.navigator, HTMLElement: browser.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  await browser.happyDOM.close();
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

const marker = (): HTMLElement | null => document.querySelector('[data-subagents-marker]');

const renderMarker = (count: number, running: number) => root.render(
  <I18nProvider><SubagentsRowMarker count={count} running={running} /></I18nProvider>,
);

test('no children, no mark', async () => {
  await act(async () => renderMarker(0, 0));
  expect(marker()).toBeNull();
});

test('idle children: a muted count that names them on hover', async () => {
  await act(async () => renderMarker(3, 0));
  const element = marker();
  expect(element?.textContent).toBe('3');
  expect(element?.getAttribute('aria-label')).toBe('3 subagents · 0 running');
  expect(element?.className).toContain('text-muted-foreground');
  expect(element?.hasAttribute('data-running')).toBe(false);
});

test('a running child tints the mark', async () => {
  await act(async () => renderMarker(2, 1));
  const element = marker();
  expect(element?.getAttribute('aria-label')).toBe('2 subagents · 1 running');
  expect(element?.className).toContain('--status-info');
  expect(element?.className).not.toContain('text-muted-foreground');
  expect(element?.hasAttribute('data-running')).toBe(true);
});

test('one child reads in the singular', async () => {
  await act(async () => renderMarker(1, 1));
  expect(marker()?.getAttribute('aria-label')).toBe('1 subagent · 1 running');
});

// The mark rides in the meta cluster next to the time on both row shapes, so
// the hover actions cover it like the rest of the cluster and the two-line
// row's branch line stays as it was.
for (const compact of [true, false]) {
  test(`the row body places the mark in its meta cluster (compact: ${compact})`, async () => {
    await act(async () => root.render(<I18nProvider><SessionTimelineRowBody
      compact={compact}
      project={null}
      projectLabel={null}
      title="row"
      titleClassName=""
      branchLabel="feature/rows"
      statusDot={null}
      pinnedMarker={null}
      subagentsMarker={<SubagentsRowMarker count={2} running={0} />}
      timeSlot="1m"
      directoryIndicator={null}
      prBadge={null}
      zombieIndicator={null}
      badges={null}
      hideMetaOnHoverClass=""
    /></I18nProvider>));
    const element = marker();
    expect(element).not.toBeNull();
    expect(element?.parentElement?.textContent).toContain('1m');
  });
}
