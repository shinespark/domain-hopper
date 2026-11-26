import { reconcile, type OpResult, type Project } from './projects';

const PROJECT_PREFIX = 'project:';
const ORDER_KEY = 'projectOrder';

export async function loadProjects(): Promise<Project[]> {
  const all = await browser.storage.sync.get(null);
  const projects = Object.entries(all)
    .filter(([key]) => key.startsWith(PROJECT_PREFIX))
    .map(([, value]) => value as Project);
  const order = Array.isArray(all[ORDER_KEY]) ? (all[ORDER_KEY] as string[]) : [];
  return reconcile(order, projects);
}

export async function updateProjects(op: (current: Project[]) => OpResult | Project[]): Promise<OpResult> {
  const current = await loadProjects();
  const returned = op(current);
  const result: OpResult = Array.isArray(returned) ? { ok: true, projects: returned } : returned;
  if (!result.ok) return result;

  const next = result.projects;
  const before = new Map(current.map((p) => [p.id, JSON.stringify(p)]));
  const changed: Record<string, Project | string[]> = {};
  for (const project of next) {
    if (before.get(project.id) !== JSON.stringify(project)) changed[PROJECT_PREFIX + project.id] = project;
  }
  const nextIds = new Set(next.map((p) => p.id));
  const removed = current.filter((p) => !nextIds.has(p.id)).map((p) => PROJECT_PREFIX + p.id);
  const orderChanged = JSON.stringify(current.map((p) => p.id)) !== JSON.stringify(next.map((p) => p.id));
  if (orderChanged) changed[ORDER_KEY] = next.map((p) => p.id);

  if (removed.length > 0) await browser.storage.sync.remove(removed);
  if (Object.keys(changed).length > 0) await browser.storage.sync.set(changed);
  return result;
}

export function watchProjects(onChange: (projects: Project[]) => void, onError?: (e: unknown) => void): () => void {
  let latest = 0;
  const listener = (changes: Record<string, unknown>, areaName: string) => {
    if (areaName !== 'sync') return;
    if (!Object.keys(changes).some((key) => key === ORDER_KEY || key.startsWith(PROJECT_PREFIX))) return;
    const seq = ++latest;
    loadProjects().then(
      (projects) => {
        if (seq === latest) onChange(projects);
      },
      (e) => {
        if (seq === latest) onError?.(e);
      },
    );
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
