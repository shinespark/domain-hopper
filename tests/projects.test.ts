import { describe, expect, test } from 'vitest';
import {
  addEnvironment,
  addProject,
  changeOrigin,
  createProject,
  findProjectByOrigin,
  moveEnvironment,
  moveProject,
  reconcile,
  removeEnvironment,
  removeProject,
  renameEnvironment,
  renameProject,
  type Project,
} from '../lib/projects';

const env = (id: string, origin: string, label = origin) => ({ id, label, origin });
const project = (id: string, name: string, environments = [env(`${id}-e`, `https://${id}.example.com`)]): Project => ({
  id,
  name,
  environments,
});

function unwrap(result: ReturnType<typeof createProject>): Project[] {
  if (!result.ok) throw new Error('expected ok');
  return result.projects;
}

describe('createProject', () => {
  test('末尾に追加し、最初の行き先のラベルは host になる', () => {
    const base = [project('a', 'A')];
    const projects = unwrap(createProject(base, 'B', 'http://localhost:3000'));
    expect(projects).toHaveLength(2);
    expect(projects[0]!).toEqual(base[0]);
    expect(projects[1]!.name).toBe('B');
    expect(projects[1]!.id).toEqual(expect.any(String));
    expect(projects[1]!.environments).toEqual([
      { id: expect.any(String), label: 'localhost:3000', origin: 'http://localhost:3000' },
    ]);
  });

  test('登録済みの origin は origin-taken になる', () => {
    const base = [project('a', 'A')];
    expect(createProject(base, 'B', 'https://a.example.com')).toEqual({
      ok: false,
      reason: 'origin-taken',
      projectName: 'A',
    });
  });
});

describe('addEnvironment', () => {
  test('対象プロジェクトの末尾に追加する', () => {
    const base = [project('a', 'A'), project('b', 'B')];
    const projects = unwrap(addEnvironment(base, 'a', 'http://localhost:3000'));
    expect(projects[0]!.environments).toHaveLength(2);
    expect(projects[0]!.environments[1]).toEqual({
      id: expect.any(String),
      label: 'localhost:3000',
      origin: 'http://localhost:3000',
    });
    expect(projects[1]!).toEqual(base[1]);
  });

  test('別プロジェクトに登録済みの origin は origin-taken になる', () => {
    const base = [project('a', 'A'), project('b', 'B')];
    expect(addEnvironment(base, 'a', 'https://b.example.com')).toEqual({
      ok: false,
      reason: 'origin-taken',
      projectName: 'B',
    });
  });
});

describe('findProjectByOrigin', () => {
  const base = [project('a', 'A'), project('b', 'B')];
  test('一致するプロジェクトを返す', () => {
    expect(findProjectByOrigin(base, 'https://b.example.com')?.id).toBe('b');
  });
  test('なければ undefined', () => {
    expect(findProjectByOrigin(base, 'https://none.example.com')).toBeUndefined();
  });
});

describe('並べ替えと編集', () => {
  const base = [project('a', 'A'), project('b', 'B'), project('c', 'C')];
  const ids = (ps: Project[]) => ps.map((p) => p.id);

  test('moveProject', () => {
    expect(ids(moveProject(base, 'a', 2))).toEqual(['b', 'c', 'a']);
    expect(ids(moveProject(base, 'c', 0))).toEqual(['c', 'a', 'b']);
  });

  test('moveProject は範囲外の toIndex を端に丸める', () => {
    expect(ids(moveProject(base, 'a', 99))).toEqual(['b', 'c', 'a']);
    expect(ids(moveProject(base, 'c', -5))).toEqual(['c', 'a', 'b']);
  });

  const withEnvs = [project('p', 'P', [env('1', 'https://1.test'), env('2', 'https://2.test'), env('3', 'https://3.test')])];
  const envIds = (ps: Project[]) => ps[0]!.environments.map((e) => e.id);

  test('moveEnvironment は範囲外の toIndex を端に丸める', () => {
    expect(envIds(moveEnvironment(withEnvs, 'p', '1', 1))).toEqual(['2', '1', '3']);
    expect(envIds(moveEnvironment(withEnvs, 'p', '1', 99))).toEqual(['2', '3', '1']);
    expect(envIds(moveEnvironment(withEnvs, 'p', '3', -1))).toEqual(['3', '1', '2']);
  });

  test('renameProject / renameEnvironment', () => {
    expect(renameProject(base, 'b', 'X')[1]!.name).toBe('X');
    expect(renameEnvironment(withEnvs, 'p', '2', 'L')[0]!.environments[1]!.label).toBe('L');
  });

  test('removeProject', () => {
    expect(ids(removeProject(base, 'b'))).toEqual(['a', 'c']);
  });

  test('removeEnvironment で最後の行き先を消してもプロジェクトは残る', () => {
    const result = removeEnvironment(base, 'a', 'a-e');
    expect(result[0]!.id).toBe('a');
    expect(result[0]!.environments).toEqual([]);
  });

  test('存在しない id は何も変えない', () => {
    expect(moveProject(base, 'zzz', 0)).toEqual(base);
    expect(removeProject(base, 'zzz')).toEqual(base);
  });
});

describe('reconcile', () => {
  const ids = (ps: Project[]) => ps.map((p) => p.id);

  test('並び順に従って並べる', () => {
    const ps = [project('a', 'A'), project('b', 'B'), project('c', 'C')];
    expect(ids(reconcile(['c', 'a', 'b'], ps))).toEqual(['c', 'a', 'b']);
  });

  test('並び順にないプロジェクトは id の昇順で末尾に足す', () => {
    const ps = [project('z', 'Z'), project('a', 'A'), project('m', 'M'), project('k', 'K')];
    expect(ids(reconcile(['m'], ps))).toEqual(['m', 'a', 'k', 'z']);
  });

  test('存在しない id を指す並び順は無視する', () => {
    const ps = [project('a', 'A'), project('b', 'B')];
    expect(ids(reconcile(['x', 'b', 'y', 'a'], ps))).toEqual(['b', 'a']);
  });

  test('同じ origin は並び順で先のプロジェクトに残し、後からは外す', () => {
    const shared = 'https://shared.example.com';
    const ps = [
      project('a', 'A', [env('a1', shared), env('a2', 'https://a2.test')]),
      project('b', 'B', [env('b1', shared), env('b2', 'https://b2.test')]),
    ];
    const result = reconcile(['b', 'a'], ps);
    expect(ids(result)).toEqual(['b', 'a']);
    expect(result[0]!.environments.map((e) => e.id)).toEqual(['b1', 'b2']);
    expect(result[1]!.environments.map((e) => e.id)).toEqual(['a2']);
  });
});

describe('非破壊', () => {
  test('どの関数も引数を変更しない', () => {
    const base = [
      project('a', 'A', [env('1', 'https://1.test'), env('2', 'https://2.test')]),
      project('b', 'B', [env('3', 'https://3.test'), env('4', 'https://1.test')]),
    ];
    const order = ['b', 'a'];
    const calls: Array<() => unknown> = [
      () => findProjectByOrigin(base, 'https://1.test'),
      () => createProject(base, 'N', 'https://n.test'),
      () => createProject(base, 'N', 'https://1.test'),
      () => addEnvironment(base, 'a', 'https://n.test'),
      () => renameProject(base, 'a', 'X'),
      () => removeProject(base, 'a'),
      () => moveProject(base, 'a', 1),
      () => renameEnvironment(base, 'a', '1', 'X'),
      () => removeEnvironment(base, 'a', '1'),
      () => moveEnvironment(base, 'a', '1', 1),
      () => reconcile(order, base),
    ];
    for (const call of calls) {
      const before = structuredClone(base);
      const orderBefore = structuredClone(order);
      call();
      expect(base).toEqual(before);
      expect(order).toEqual(orderBefore);
    }
  });
});

describe('changeOrigin', () => {
  const a = project('a', 'A', [env('a1', 'https://a.example.com', 'Prod'), env('a2', 'https://stg.a.example.com', 'Stg')]);
  const b = project('b', 'B', [env('b1', 'http://localhost:3000')]);

  test('行き先の origin だけを変え、ラベルは保つ', () => {
    const result = changeOrigin([a, b], 'a', 'a1', 'http://a.example.com');
    expect(result).toEqual({
      ok: true,
      projects: [{ ...a, environments: [env('a1', 'http://a.example.com', 'Prod'), a.environments[1]] }, b],
    });
  });

  test('ほかのプロジェクトで使われている origin には変えられない', () => {
    expect(changeOrigin([a, b], 'a', 'a1', 'http://localhost:3000')).toEqual({
      ok: false,
      reason: 'origin-taken',
      projectName: 'B',
    });
  });

  test('同じプロジェクトの別の行き先と重なる origin にも変えられない', () => {
    expect(changeOrigin([a, b], 'a', 'a1', 'https://stg.a.example.com')).toEqual({
      ok: false,
      reason: 'origin-taken',
      projectName: 'A',
    });
  });

  test('同じ origin のままなら変更なしで成功する', () => {
    expect(changeOrigin([a, b], 'a', 'a1', 'https://a.example.com')).toEqual({ ok: true, projects: [a, b] });
  });
});

describe('addProject', () => {
  test('行き先のないプロジェクトを末尾に足す', () => {
    const a = project('a', 'A');
    const result = addProject([a], 'New');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(a);
    expect(result[1]).toEqual({ id: expect.any(String), name: 'New', environments: [] });
  });
});
