import { fakeBrowser } from 'wxt/testing/fake-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject, removeProject, renameProject, type Project } from '../lib/projects';
import { loadProjects, updateProjects, watchProjects } from '../lib/storage';

async function create(name: string, origin: string): Promise<Project> {
  const result = await updateProjects((p) => createProject(p, name, origin));
  if (!result.ok) throw new Error('create failed');
  return result.projects[result.projects.length - 1]!;
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
});

describe('loadProjects', () => {
  it('returns [] when nothing is stored', async () => {
    expect(await loadProjects()).toEqual([]);
  });
});

describe('updateProjects', () => {
  it('writes project:<id> and projectOrder when creating', async () => {
    const a = await create('A', 'https://a.example.com');
    const stored = await fakeBrowser.storage.sync.get(null);
    expect(stored[`project:${a.id}`]).toEqual(a);
    expect(stored.projectOrder).toEqual([a.id]);
    expect(await loadProjects()).toEqual([a]);
  });

  it('only sets the changed project on rename', async () => {
    const a = await create('A', 'https://a.example.com');
    const b = await create('B', 'https://b.example.com');
    const set = vi.spyOn(fakeBrowser.storage.sync, 'set');
    await updateProjects((p) => renameProject(p, a.id, 'A2'));
    expect(set).toHaveBeenCalledTimes(1);
    const keys = Object.keys(set.mock.calls[0]![0] as object);
    expect(keys).toEqual([`project:${a.id}`]);
    expect(keys).not.toContain(`project:${b.id}`);
  });

  it('removes the key and drops it from projectOrder on delete', async () => {
    const a = await create('A', 'https://a.example.com');
    const b = await create('B', 'https://b.example.com');
    await updateProjects((p) => removeProject(p, a.id));
    const stored = await fakeBrowser.storage.sync.get(null);
    expect(stored[`project:${a.id}`]).toBeUndefined();
    expect(stored.projectOrder).toEqual([b.id]);
  });

  it('keeps projects synced in behind a stale array', async () => {
    const a = await create('A', 'https://a.example.com');
    const b: Project = { id: 'b-id', name: 'B', environments: [{ id: 'e', label: 'b', origin: 'https://b.example.com' }] };
    await fakeBrowser.storage.sync.set({ [`project:${b.id}`]: b, projectOrder: [a.id, b.id] });
    const result = await updateProjects((p) => renameProject(p, a.id, 'x'));
    expect(result.ok && result.projects.map((p) => p.id)).toEqual([a.id, b.id]);
    expect((await loadProjects()).map((p) => p.name)).toEqual(['x', 'B']);
  });

  it('writes nothing when op returns ok: false', async () => {
    await create('A', 'https://a.example.com');
    const set = vi.spyOn(fakeBrowser.storage.sync, 'set');
    const remove = vi.spyOn(fakeBrowser.storage.sync, 'remove');
    const result = await updateProjects((p) => createProject(p, 'dup', 'https://a.example.com'));
    expect(result).toEqual({ ok: false, reason: 'origin-taken', projectName: 'A' });
    expect(set).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects and leaves storage unchanged when set fails', async () => {
    const a = await create('A', 'https://a.example.com');
    const before = await fakeBrowser.storage.sync.get(null);
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValue(new Error('QUOTA_BYTES'));
    await expect(updateProjects((p) => renameProject(p, a.id, 'x'))).rejects.toThrow('QUOTA_BYTES');
    expect(await fakeBrowser.storage.sync.get(null)).toEqual(before);
  });
});

describe('updateProjects remove failure', () => {
  it('rejects and leaves storage unchanged when remove fails', async () => {
    const a = await create('A', 'https://a.example.com');
    const before = await fakeBrowser.storage.sync.get(null);
    vi.spyOn(fakeBrowser.storage.sync, 'remove').mockRejectedValue(new Error('boom'));
    await expect(updateProjects((p) => removeProject(p, a.id))).rejects.toThrow('boom');
    expect(await fakeBrowser.storage.sync.get(null)).toEqual(before);
  });
});

describe('watchProjects', () => {
  it('notifies with the latest projects and stops after unsubscribe', async () => {
    const onChange = vi.fn();
    const unwatch = watchProjects(onChange);
    const a = await create('A', 'https://a.example.com');
    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith([a]));
    unwatch();
    onChange.mockClear();
    await create('B', 'https://b.example.com');
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('delivers the newer snapshot last when reloads resolve out of order', async () => {
    const a = await create('A', 'https://a.example.com');
    const b = await create('B', 'https://b.example.com');
    const real = fakeBrowser.storage.sync.get.bind(fakeBrowser.storage.sync);
    const resolvers: (() => void)[] = [];
    vi.spyOn(fakeBrowser.storage.sync, 'get').mockImplementation(((keys: never) => {
      const snapshot = real(keys);
      return new Promise((resolve) => {
        resolvers.push(() => resolve(snapshot));
      });
    }) as never);
    const onChange = vi.fn();
    watchProjects(onChange);
    await fakeBrowser.storage.onChanged.trigger({}, 'sync');
    await fakeBrowser.storage.onChanged.trigger({}, 'sync');
    expect(resolvers).toHaveLength(2);
    resolvers[1]!();
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    resolvers[0]!();
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith([a, b]);
  });

  it('reports load failures to onError', async () => {
    vi.spyOn(fakeBrowser.storage.sync, 'get').mockRejectedValue(new Error('x'));
    const onError = vi.fn();
    watchProjects(vi.fn(), onError);
    await fakeBrowser.storage.onChanged.trigger({}, 'sync');
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });
});
