// beautiful-mermaid pulls elkjs (~1.5 MB raw) for diagram layout. The markdown
// renderer is preloaded at boot, so a static import here would make every
// page load parse that layout engine although most sessions never show a
// diagram. Same shape as markdownRendererLoader: one cached promise, a sync
// accessor once loaded, and a failed import can be retried.
type MermaidModule = typeof import('beautiful-mermaid');

let mermaidModulePromise: Promise<MermaidModule> | null = null;
let mermaidModule: MermaidModule | null = null;

export const loadMermaidModule = (): Promise<MermaidModule> => {
  mermaidModulePromise ??= import('beautiful-mermaid')
    .then((module) => {
      mermaidModule = module;
      return module;
    })
    .catch((error) => {
      mermaidModulePromise = null;
      throw error;
    });
  return mermaidModulePromise;
};

export const getLoadedMermaidModule = (): MermaidModule | null => mermaidModule;
