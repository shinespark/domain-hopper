import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../entrypoints/popup/App';
import RegisterPanel from '../entrypoints/popup/RegisterPanel';
import { t } from '../lib/i18n';
import { loadProjects } from '../lib/storage';
import { getActiveTab } from '../lib/tabs';

vi.mock('../lib/tabs', () => ({ getActiveTab: vi.fn(), openInTab: vi.fn() }));

const project = {
  id: 'p1',
  name: 'my-service',
  environments: [{ id: 'e1', label: 'Production', origin: 'https://example.com' }],
};
const empty = { id: 'p2', name: 'empty-one', environments: [] };

async function seed(projects: (typeof project)[] = [project]) {
  const items: Record<string, unknown> = {
    projectOrder: projects.map((p) => p.id),
  };
  for (const p of projects) items[`project:${p.id}`] = p;
  await fakeBrowser.storage.sync.set(items);
}

function mockTab(url: string) {
  vi.mocked(getActiveTab).mockResolvedValue({ id: 7, index: 2, url });
}

afterEach(cleanup);

beforeEach(() => {
  fakeBrowser.reset();
  vi.clearAllMocks();
  vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation(((key: string, subs?: string) =>
    subs ? `msg:${key}:${subs}` : `msg:${key}`) as never);
});

describe('popup register', () => {
  it('shows the origin heading and both actions for an unregistered origin', async () => {
    await seed();
    mockTab('https://stg3.example.com/x');
    render(<App />);
    expect((await screen.findByRole('heading', { name: 'stg3.example.com' })).getAttribute('title')).toBe(
      'stg3.example.com',
    );
    expect(screen.getByRole('button', { name: t('createProject') })).toBeTruthy();
    expect(screen.getByRole('button', { name: t('addToExisting') })).toBeTruthy();
  });

  it('creates a project with the default name and switches to the list', async () => {
    await seed();
    mockTab('https://stg3.example.com/x');
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: t('createProject') }));
    const input = screen.getByRole('textbox', {
      name: t('projectNameLabel'),
    }) as HTMLInputElement;
    expect(input.value).toBe('stg3.example.com');
    await userEvent.click(screen.getByRole('button', { name: t('create') }));
    const row = await screen.findByRole('button', {
      name: /stg3\.example\.com/,
    });
    expect(row.getAttribute('aria-current')).toBe('true');
    const stored = await loadProjects();
    expect(stored.map((p) => p.name)).toEqual(['my-service', 'stg3.example.com']);
  });

  it('does not allow a blank project name', async () => {
    await seed();
    mockTab('https://stg3.example.com/x');
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: t('createProject') }));
    const input = screen.getByRole('textbox', { name: t('projectNameLabel') });
    await userEvent.clear(input);
    await userEvent.type(input, '   ');
    expect((screen.getByRole('button', { name: t('create') }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('hides add-to-existing when there are no projects', async () => {
    mockTab('https://stg3.example.com/x');
    render(<App />);
    await screen.findByRole('button', { name: t('createProject') });
    expect(screen.queryByRole('button', { name: t('addToExisting') })).toBeNull();
  });

  it('adds the origin to the chosen project and switches to the list', async () => {
    await seed();
    mockTab('https://stg3.example.com/x');
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: t('addToExisting') }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: t('addToExisting') }), 'p1');
    await userEvent.click(screen.getByRole('button', { name: t('confirm') }));
    await screen.findByRole('list');
    const stored = await loadProjects();
    expect(stored[0]?.environments.map((e) => e.origin)).toEqual(['https://example.com', 'https://stg3.example.com']);
  });

  it('shows the register panel for a project with no environments', async () => {
    await seed([empty]);
    mockTab('https://stg3.example.com/x');
    render(<App />);
    expect(await screen.findByRole('button', { name: t('createProject') })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('switches to the list when another device registers the origin while the panel is open', async () => {
    await seed();
    mockTab('https://stg3.example.com/x');
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: t('createProject') }));
    await fakeBrowser.storage.sync.set({
      'project:p9': {
        id: 'p9',
        name: 'other-service',
        environments: [{ id: 'e9', label: 'x', origin: 'https://stg3.example.com' }],
      },
      projectOrder: ['p1', 'p9'],
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: t('create') })).toBeNull());
  });

  it('shows t(originTaken) when update reports origin-taken', async () => {
    const update = vi.fn().mockResolvedValue({
      ok: false,
      reason: 'origin-taken',
      projectName: 'my-service',
    });
    render(<RegisterPanel origin="https://stg3.example.com" projects={[project]} update={update} />);
    await userEvent.click(screen.getByRole('button', { name: t('createProject') }));
    await userEvent.click(screen.getByRole('button', { name: t('create') }));
    expect((await screen.findByRole('alert')).textContent).toBe(t('originTaken', 'my-service'));
  });

  it('adds to the project actually shown when the selected one is removed mid-popup', async () => {
    const second = {
      id: 'p3',
      name: 'second',
      environments: [{ id: 'e3', label: 'Prod', origin: 'https://second.example.com' }],
    };
    await seed([project, second]);
    mockTab('https://stg3.example.com/x');
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: t('addToExisting') }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: t('addToExisting') }), 'p3');
    await fakeBrowser.storage.sync.remove('project:p3');
    await fakeBrowser.storage.sync.set({ projectOrder: ['p1'] });
    await waitFor(() => expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('p1'));
    await userEvent.click(screen.getByRole('button', { name: t('confirm') }));
    await screen.findByRole('list');
    const stored = await loadProjects();
    expect(stored.map((p) => p.id)).toEqual(['p1']);
    expect(stored[0]?.environments.map((e) => e.origin)).toEqual(['https://example.com', 'https://stg3.example.com']);
  });
});
