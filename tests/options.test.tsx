import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../entrypoints/options/App';
import { t } from '../lib/i18n';
import { loadProjects } from '../lib/storage';

const p1 = {
  id: 'p1',
  name: 'alpha',
  environments: [
    { id: 'e1', label: 'Production', origin: 'https://example.com' },
    { id: 'e2', label: 'Insecure', origin: 'http://example.com' },
  ],
};
const p2 = { id: 'p2', name: 'beta', environments: [] };

async function seed(projects: (typeof p1)[] = [p1, p2]) {
  const items: Record<string, unknown> = { projectOrder: projects.map((p) => p.id) };
  for (const p of projects) items[`project:${p.id}`] = p;
  await fakeBrowser.storage.sync.set(items);
}

const row = (value: string) => screen.getByDisplayValue(value).closest('li') as HTMLElement;
const btn = (scope: HTMLElement, key: Parameters<typeof t>[0]) => within(scope).getAllByRole('button', { name: t(key) })[0]!;

afterEach(cleanup);

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
  vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation(((key: string) => `msg:${key}`) as never);
});

describe('options page', () => {
  it('lists projects in order with full origins and sets the title', async () => {
    await seed();
    render(<App />);
    await screen.findByDisplayValue('alpha');
    const names = screen.getAllByRole('textbox', { name: t('projectNameLabel') }).map((i) => (i as HTMLInputElement).value);
    expect(names).toEqual(['alpha', 'beta']);
    expect(screen.getByText('https://example.com')).toBeTruthy();
    expect(screen.getByText('http://example.com')).toBeTruthy();
    expect(document.title).toBe(t('optionsTitle'));
  });

  it('shows the empty message and no add controls', async () => {
    render(<App />);
    expect(await screen.findByText(t('noProjects'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: /add/i })).toBeNull();
  });

  it('renames a project on Enter and an environment on blur', async () => {
    await seed();
    render(<App />);
    const name = await screen.findByDisplayValue('alpha');
    await userEvent.clear(name);
    await userEvent.type(name, 'gamma{Enter}');
    await waitFor(async () => expect((await loadProjects())[0]!.name).toBe('gamma'));
    const label = screen.getByDisplayValue('Production');
    await userEvent.clear(label);
    await userEvent.type(label, 'Prod');
    await userEvent.tab();
    await waitFor(async () => expect((await loadProjects())[0]!.environments[0]!.label).toBe('Prod'));
  });

  it('reverts a whitespace-only name without saving', async () => {
    await seed();
    render(<App />);
    const name = await screen.findByDisplayValue('alpha');
    await userEvent.clear(name);
    await userEvent.type(name, '   {Enter}');
    await waitFor(() => expect((screen.getAllByRole('textbox')[0]! as HTMLInputElement).value).toBe('alpha'));
    expect((await loadProjects())[0]!.name).toBe('alpha');
  });

  it('reorders projects and environments', async () => {
    await seed();
    render(<App />);
    await screen.findByDisplayValue('alpha');
    await userEvent.click(btn(row('beta'), 'moveUp'));
    await waitFor(async () => expect((await loadProjects()).map((p) => p.id)).toEqual(['p2', 'p1']));
    await userEvent.click(btn(row('Insecure'), 'moveUp'));
    await waitFor(async () =>
      expect((await loadProjects()).find((p) => p.id === 'p1')!.environments.map((e) => e.id)).toEqual(['e2', 'e1']),
    );
  });

  it('asks for confirmation before deleting, and can cancel', async () => {
    await seed();
    render(<App />);
    await screen.findByDisplayValue('alpha');
    const env = row('Insecure');
    await userEvent.click(btn(env, 'delete'));
    await userEvent.click(btn(env, 'cancel'));
    expect((await loadProjects())[0]!.environments).toHaveLength(2);
    await userEvent.click(btn(env, 'delete'));
    await userEvent.click(btn(env, 'delete'));
    await waitFor(async () => expect((await loadProjects())[0]!.environments.map((e) => e.id)).toEqual(['e1']));

    const proj = row('beta');
    await userEvent.click(btn(proj, 'delete'));
    await userEvent.click(btn(proj, 'delete'));
    await waitFor(async () => expect((await loadProjects()).map((p) => p.id)).toEqual(['p1']));
  });

  it('reflects changes made on another device', async () => {
    await seed();
    render(<App />);
    await screen.findByDisplayValue('alpha');
    await fakeBrowser.storage.sync.set({ 'project:p1': { ...p1, name: 'remote' } });
    expect(await screen.findByDisplayValue('remote')).toBeTruthy();
  });

  it('shows an alert when saving fails', async () => {
    await seed();
    render(<App />);
    const name = await screen.findByDisplayValue('alpha');
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValue(new Error('quota'));
    await userEvent.clear(name);
    await userEvent.type(name, 'x{Enter}');
    expect((await screen.findByRole('alert')).textContent).toBe(t('errorSaveFailed'));
  });
});
