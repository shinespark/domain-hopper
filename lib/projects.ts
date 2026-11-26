import { defaultLabel } from './url';

export type Environment = { id: string; label: string; origin: string };
export type Project = { id: string; name: string; environments: Environment[] };
export type OpResult =
  | { ok: true; projects: Project[] }
  | { ok: false; reason: 'origin-taken'; projectName: string };

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length - 1));
}

function moveItem<T>(items: T[], from: number, toIndex: number): T[] {
  if (from < 0) return items.slice();
  const next = items.slice();
  const removed = next.splice(from, 1);
  next.splice(clampIndex(toIndex, items.length), 0, ...removed);
  return next;
}

function updateProject(projects: Project[], projectId: string, update: (project: Project) => Project): Project[] {
  return projects.map((p) => (p.id === projectId ? update(p) : p));
}

function newEnvironment(origin: string): Environment {
  return { id: crypto.randomUUID(), label: defaultLabel(origin), origin };
}

export function findProjectByOrigin(projects: Project[], origin: string): Project | undefined {
  return projects.find((p) => p.environments.some((e) => e.origin === origin));
}

export function createProject(projects: Project[], name: string, origin: string): OpResult {
  const taken = findProjectByOrigin(projects, origin);
  if (taken) return { ok: false, reason: 'origin-taken', projectName: taken.name };
  const project: Project = { id: crypto.randomUUID(), name, environments: [newEnvironment(origin)] };
  return { ok: true, projects: [...projects, project] };
}

export function addEnvironment(projects: Project[], projectId: string, origin: string): OpResult {
  const taken = findProjectByOrigin(projects, origin);
  if (taken) return { ok: false, reason: 'origin-taken', projectName: taken.name };
  return {
    ok: true,
    projects: updateProject(projects, projectId, (p) => ({
      ...p,
      environments: [...p.environments, newEnvironment(origin)],
    })),
  };
}

export function renameProject(projects: Project[], projectId: string, name: string): Project[] {
  return updateProject(projects, projectId, (p) => ({ ...p, name }));
}

export function removeProject(projects: Project[], projectId: string): Project[] {
  return projects.filter((p) => p.id !== projectId);
}

export function moveProject(projects: Project[], projectId: string, toIndex: number): Project[] {
  return moveItem(
    projects,
    projects.findIndex((p) => p.id === projectId),
    toIndex,
  );
}

export function renameEnvironment(projects: Project[], projectId: string, envId: string, label: string): Project[] {
  return updateProject(projects, projectId, (p) => ({
    ...p,
    environments: p.environments.map((e) => (e.id === envId ? { ...e, label } : e)),
  }));
}

export function changeOrigin(projects: Project[], projectId: string, envId: string, origin: string): OpResult {
  const taken = projects.find((p) =>
    p.environments.some((e) => e.origin === origin && !(p.id === projectId && e.id === envId)),
  );
  if (taken) return { ok: false, reason: 'origin-taken', projectName: taken.name };
  return {
    ok: true,
    projects: updateProject(projects, projectId, (p) => ({
      ...p,
      environments: p.environments.map((e) => (e.id === envId ? { ...e, origin } : e)),
    })),
  };
}

export function removeEnvironment(projects: Project[], projectId: string, envId: string): Project[] {
  return updateProject(projects, projectId, (p) => ({
    ...p,
    environments: p.environments.filter((e) => e.id !== envId),
  }));
}

export function moveEnvironment(projects: Project[], projectId: string, envId: string, toIndex: number): Project[] {
  return updateProject(projects, projectId, (p) => ({
    ...p,
    environments: moveItem(
      p.environments,
      p.environments.findIndex((e) => e.id === envId),
      toIndex,
    ),
  }));
}

export function reconcile(order: string[], projects: Project[]): Project[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const ordered: Project[] = [];
  for (const id of order) {
    const project = byId.get(id);
    if (project) {
      ordered.push(project);
      byId.delete(id);
    }
  }
  const rest = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const seen = new Set<string>();
  return [...ordered, ...rest].map((p) => ({
    ...p,
    environments: p.environments.filter((e) => {
      if (seen.has(e.origin)) return false;
      seen.add(e.origin);
      return true;
    }),
  }));
}
