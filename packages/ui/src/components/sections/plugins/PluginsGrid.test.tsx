import { afterEach, expect, spyOn, test } from 'bun:test';
import { Window } from 'happy-dom';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser, document: browser.document, navigator: browser.navigator,
  localStorage: browser.localStorage, sessionStorage: browser.sessionStorage,
  Event: browser.Event, FocusEvent: browser.FocusEvent,
  Node: browser.Node, Element: browser.Element, HTMLElement: browser.HTMLElement,
  MutationObserver: browser.MutationObserver, ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
});
const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
  if (url.pathname === '/api/fs/home') return Response.json({ home: '/test' });
  if (url.pathname === '/api/location') return Response.json({ data: { directory: '/test' } });
  if (url.pathname === '/api/session') return Response.json({ data: [], cursor: {} });
  throw new Error(`Unexpected request: ${url.pathname}`);
});
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { usePluginsStore, getPluginsScopeKey } = await import('@/stores/usePluginsStore');
const { useProjectsStore } = await import('@/stores/useProjectsStore');
const { PluginsGrid } = await import('./PluginsGrid');
const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
afterEach(async () => {
  await act(async () => root.unmount());
  fetchSpy.mockRestore();
  browser.close();
});

const cardTitles = (): string[] => Array.from(container.querySelectorAll('.font-semibold[title]')).map((node) => node.getAttribute('title') ?? '');

test('a config entry and the discovered plugin it names render as one card with the entry options and the shared load state', async () => {
  const configDir = '/home/u/.config/opencode';
  const realDir = '/home/u/dev/plugins';
  const entry = {
    id: 'entry-foo', spec: './plugins/foo', scope: 'user', kind: 'config', parsedKind: 'path',
    sourcePath: `${configDir}/opencode.jsonc`, absolutePath: `${configDir}/plugins/foo`, realPath: `${realDir}/foo`,
    fileId: 'file-foo', options: { debug: true },
  } satisfies import('@/stores/usePluginsStore').PluginEntry;
  const shadowed = {
    id: 'file-foo', fileName: 'foo', scope: 'user', kind: 'package',
    absolutePath: `${configDir}/plugins/foo`, realPath: `${realDir}/foo`, configEntryId: 'entry-foo',
  } satisfies import('@/stores/usePluginsStore').PluginFile;
  const standalone = {
    id: 'file-bar', fileName: 'bar', scope: 'user', kind: 'package',
    absolutePath: `${configDir}/plugins/bar`, realPath: `${realDir}/bar`,
  } satisfies import('@/stores/usePluginsStore').PluginFile;
  useProjectsStore.setState({ projects: [{ id: 'a', path: '/a' }], activeProjectId: 'a' });
  const runtimeKey = (await import('@/lib/runtime-switch')).getRuntimeKey();
  usePluginsStore.setState({
    entries: [entry], files: [shadowed, standalone], loadedDirectory: '/a', loadedRuntimeKey: runtimeKey, selectedId: null, draft: null,
    loadPlugins: async () => true,
    runtime: { kind: 'ready', scope: getPluginsScopeKey('/a'), plugins: [
      { source: { kind: 'local', path: `${realDir}/foo/index.ts` }, state: { kind: 'active' } },
    ] },
  });

  await act(async () => root.render(<I18nProvider><PluginsGrid onAdd={() => {}} onDelete={() => {}} /></I18nProvider>));

  expect(cardTitles()).toEqual(['./plugins/foo', 'bar']);
  // Each title sits in `.mt-3` inside the card body; the card is that wrapper's parent.
  const cardText = (title: string): string => container.querySelector(`.font-semibold[title="${title}"]`)?.parentElement?.parentElement?.textContent ?? '';
  expect(cardText('./plugins/foo')).toContain('Loaded');
  expect(cardText('./plugins/foo')).not.toContain('Not loaded');
  expect(cardText('bar')).toContain('Not loaded');
});
