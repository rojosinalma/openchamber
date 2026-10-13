import { afterEach, beforeEach, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import { SessionTimelineRowBody } from './SessionTimelineRowBody';

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

const title = 'درخواست پاسخ فارسی با React';

const renderRow = (compact: boolean) => root.render(<SessionTimelineRowBody
  compact={compact}
  project={null}
  projectLabel={null}
  title={title}
  titleClassName=""
  branchLabel={null}
  statusDot={null}
  pinnedMarker={null}
  timeSlot="1m"
  directoryIndicator={null}
  prBadge={null}
  zombieIndicator={null}
  badges={null}
  hideMetaOnHoverClass=""
/>);

// A truncated title in an LTR box clips an RTL title's beginning, because its
// first word sits at the right edge. dir=auto lets the title own its direction.
for (const compact of [true, false]) {
  test(`the title resolves its own direction (compact: ${compact})`, async () => {
    await act(async () => renderRow(compact));
    const element = Array.from(document.querySelectorAll('div')).find((node) => node.textContent === title);
    expect(element?.getAttribute('dir')).toBe('auto');
  });
}

// Single-line rows: what closed the second line (PR badge or zombie mark,
// provider logo) moves into the title line's meta cluster, next to the time.
const renderMarkedRow = (compact: boolean, zombie: boolean) => root.render(<SessionTimelineRowBody
  compact={compact}
  project={null}
  projectLabel={null}
  title={title}
  titleClassName=""
  branchLabel="feature/rows"
  statusDot={null}
  pinnedMarker={null}
  timeSlot="1m"
  directoryIndicator={null}
  prBadge={<span data-testid="pr-badge">#42</span>}
  zombieIndicator={zombie ? <span data-testid="zombie">!</span> : null}
  badges={null}
  providerId="anthropic"
  hideMetaOnHoverClass=""
/>);

const metaOf = (marker: string): Element | null | undefined => document.querySelector(`[data-testid="${marker}"]`)?.parentElement;

test('a compact row carries the PR badge and the provider logo in its meta cluster, and drops the branch', async () => {
  await act(async () => renderMarkedRow(true, false));
  const meta = metaOf('pr-badge');
  expect(meta?.textContent).toContain('1m');
  expect(meta?.querySelector('img, svg')).not.toBeNull();
  expect(document.body.textContent).not.toContain('feature/rows');
});

test('a compact zombie row shows the zombie mark instead of the PR badge', async () => {
  await act(async () => renderMarkedRow(true, true));
  expect(document.querySelector('[data-testid="zombie"]')).not.toBeNull();
  expect(document.querySelector('[data-testid="pr-badge"]')).toBeNull();
});

test('a two-line row keeps the PR badge on its second line, away from the time', async () => {
  await act(async () => renderMarkedRow(false, false));
  expect(metaOf('pr-badge')?.textContent).not.toContain('1m');
  expect(document.body.textContent).toContain('feature/rows');
});
