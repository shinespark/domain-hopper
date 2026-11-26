import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const row = (value: string) =>
  (screen.queryByDisplayValue(value) ?? screen.getByRole('heading', { name: value })).closest('li') as HTMLElement;
const btn = (scope: HTMLElement, key: Parameters<typeof t>[0]) => within(scope).getAllByRole('button', { name: t(key) })[0]!;
const heading = (name: string) => screen.findByRole('heading', { level: 2, name });
async function editName(name: string) {
  await userEvent.click(btn(row(name), 'editProjectName'));
  return screen.getByDisplayValue(name) as HTMLInputElement;
}

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
    await heading('alpha');
    const names = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(names).toEqual(['alpha', 'beta']);
    expect(screen.queryByRole('textbox', { name: t('projectNameLabel') })).toBeNull();
    const schemes = screen.getAllByRole('combobox', { name: t('schemeLabel') }).map((el) => (el as HTMLSelectElement).value);
    expect(schemes).toEqual(['https:', 'http:']);
    const hosts = screen.getAllByRole('textbox', { name: t('hostLabel') }).map((el) => (el as HTMLInputElement).value);
    expect(hosts).toEqual(['example.com', 'example.com']);
    expect(document.title).toBe(t('optionsTitle'));
  });

  it('shows the empty message and no add controls', async () => {
    render(<App />);
    expect(await screen.findByText(t('noProjects'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: /add/i })).toBeNull();
  });

  it('ignores Enter while IME composing', async () => {
    await seed();
    render(<App />);
    await heading('alpha');
    const name = await editName('alpha');
    await userEvent.clear(name);
    await userEvent.type(name, 'gamma');
    fireEvent.keyDown(name, { key: 'Enter', isComposing: true });
    expect(document.activeElement).toBe(name);
    expect(name.value).toBe('gamma');
    expect((await loadProjects())[0]!.name).toBe('alpha');
  });

  it('renames a project on Enter and an environment on blur', async () => {
    await seed();
    render(<App />);
    await heading('alpha');
    const name = await editName('alpha');
    expect(document.activeElement).toBe(name);
    await userEvent.clear(name);
    await userEvent.type(name, 'gamma{Enter}');
    await waitFor(async () => expect((await loadProjects())[0]!.name).toBe('gamma'));
    expect(await heading('gamma')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: t('projectNameLabel') })).toBeNull();
    const label = screen.getByDisplayValue('Production');
    await userEvent.clear(label);
    await userEvent.type(label, 'Prod');
    await userEvent.tab();
    await waitFor(async () => expect((await loadProjects())[0]!.environments[0]!.label).toBe('Prod'));
  });

  it('reverts a whitespace-only name without saving', async () => {
    await seed();
    render(<App />);
    await heading('alpha');
    const name = await editName('alpha');
    await userEvent.clear(name);
    await userEvent.type(name, '   {Enter}');
    expect(await heading('alpha')).toBeTruthy();
    expect((await loadProjects())[0]!.name).toBe('alpha');
  });

  it('reorders projects and environments', async () => {
    await seed();
    render(<App />);
    await heading('alpha');
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
    await heading('alpha');
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
    await heading('alpha');
    await fakeBrowser.storage.sync.set({ 'project:p1': { ...p1, name: 'remote' } });
    expect(await heading('remote')).toBeTruthy();
  });

  it('shows an alert when saving fails', async () => {
    await seed();
    render(<App />);
    await heading('alpha');
    const name = await editName('alpha');
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValue(new Error('quota'));
    await userEvent.clear(name);
    await userEvent.type(name, 'x{Enter}');
    expect((await screen.findByRole('alert')).textContent).toBe(t('errorSaveFailed'));
  });

  describe('origin editing', () => {
    const scheme = (envLabel: string) =>
      within(row(envLabel)).getByRole('combobox', { name: t('schemeLabel') }) as HTMLSelectElement;
    const host = (envLabel: string) =>
      within(row(envLabel)).getByRole('textbox', { name: t('hostLabel') }) as HTMLInputElement;
    const origins = async () => (await loadProjects())[0]!.environments.map((e) => e.origin);

    it('changes the host on Enter and then the scheme', async () => {
      await seed();
      render(<App />);
      await heading('alpha');
      await userEvent.clear(host('Production'));
      await userEvent.type(host('Production'), 'prod.example.com:8443{Enter}');
      await waitFor(async () => expect(await origins()).toEqual(['https://prod.example.com:8443', 'http://example.com']));
      await userEvent.selectOptions(scheme('Production'), 'http:');
      await waitFor(async () => expect(await origins()).toEqual(['http://prod.example.com:8443', 'http://example.com']));
    });

    it('refuses an origin that is already registered', async () => {
      await seed();
      render(<App />);
      await heading('alpha');
      await userEvent.selectOptions(scheme('Production'), 'http:');
      expect((await screen.findByRole('alert')).textContent).toBe(t('originTaken', 'alpha'));
      expect(await origins()).toEqual(['https://example.com', 'http://example.com']);
      expect(scheme('Production').value).toBe('https:');
    });

    it('rejects a host with a path and keeps the saved value', async () => {
      await seed();
      render(<App />);
      await heading('alpha');
      await userEvent.clear(host('Production'));
      await userEvent.type(host('Production'), 'example.com/path{Enter}');
      expect((await screen.findByRole('alert')).textContent).toBe(t('invalidHost'));
      expect(host('Production').value).toBe('example.com');
      expect(await origins()).toEqual(['https://example.com', 'http://example.com']);
    });

    it('ignores Enter while IME composing in the host field', async () => {
      await seed();
      render(<App />);
      await heading('alpha');
      await userEvent.clear(host('Production'));
      await userEvent.type(host('Production'), 'new.example.com');
      fireEvent.keyDown(host('Production'), { key: 'Enter', isComposing: true });
      expect(document.activeElement).toBe(host('Production'));
      expect(await origins()).toEqual(['https://example.com', 'http://example.com']);
    });
  });
});
