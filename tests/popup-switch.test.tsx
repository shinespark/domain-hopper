import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../entrypoints/popup/App';
import { t } from '../lib/i18n';
import { getActiveTab, openInTab } from '../lib/tabs';

vi.mock('../lib/tabs', () => ({ getActiveTab: vi.fn(), openInTab: vi.fn() }));

const project = {
  id: 'p1',
  name: 'my-service',
  environments: [
    { id: 'e1', label: 'Production', origin: 'https://example.com' },
    { id: 'e2', label: 'Staging 1', origin: 'https://stg1.example.com' },
    { id: 'e3', label: 'Local', origin: 'http://localhost:3000' },
  ],
};

async function seed(projects = [project]) {
  const items: Record<string, unknown> = { projectOrder: projects.map((p) => p.id) };
  for (const p of projects) items[`project:${p.id}`] = p;
  await fakeBrowser.storage.sync.set(items);
}

function mockTab(url: string) {
  const tab = { id: 7, index: 2, url };
  vi.mocked(getActiveTab).mockResolvedValue(tab);
  return tab;
}

afterEach(cleanup);

beforeEach(() => {
  fakeBrowser.reset();
  vi.clearAllMocks();
  vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation(((key: string) => `msg:${key}`) as never);
});

describe('popup switch', () => {
  it('lists environments in order and marks the current one', async () => {
    await seed();
    mockTab('https://stg1.example.com/a?b=1');
    render(<App />);
    const rows = await screen.findAllByRole('button', { name: /Production|Staging 1|Local/ });
    expect(rows.map((r) => r.textContent)).toEqual([
      'Productionexample.com',
      'Staging 1stg1.example.com',
      'Locallocalhost:3000',
    ]);
    expect(rows.map((r) => r.getAttribute('aria-current'))).toEqual([null, 'true', null]);
  });

  it('switches in the same tab on click', async () => {
    await seed();
    const tab = mockTab('https://stg1.example.com/a?b=1');
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /Local/ }));
    expect(openInTab).toHaveBeenCalledWith(tab, 'http://localhost:3000/a?b=1', false);
  });

  it('opens a new tab on meta click, ctrl click and middle click', async () => {
    await seed();
    const tab = mockTab('https://stg1.example.com/a?b=1');
    render(<App />);
    const row = await screen.findByRole('button', { name: /Local/ });
    fireEvent.click(row, { metaKey: true });
    fireEvent.click(row, { ctrlKey: true });
    fireEvent(row, new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    expect(openInTab).toHaveBeenCalledTimes(3);
    for (const call of vi.mocked(openInTab).mock.calls) {
      expect(call).toEqual([tab, 'http://localhost:3000/a?b=1', true]);
    }
  });

  it('moves focus with ArrowDown and switches with Enter', async () => {
    await seed();
    const tab = mockTab('https://stg1.example.com/a?b=1');
    render(<App />);
    const rows = await screen.findAllByRole('button', { name: /Production|Staging 1|Local/ });
    await waitFor(() => expect(document.activeElement).toBe(rows[1]));
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(rows[2]);
    await userEvent.keyboard('{Enter}');
    expect(openInTab).toHaveBeenCalledWith(tab, 'http://localhost:3000/a?b=1', false);
  });

  it.each(['chrome://extensions', 'about:blank'])('shows only the unsupported message on %s', async (url) => {
    await seed();
    mockTab(url);
    render(<App />);
    expect(await screen.findByText(t('unsupportedPage'))).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByTestId('register-placeholder')).toBeNull();
  });

  it('shows the register placeholder for an unregistered origin', async () => {
    await seed();
    mockTab('https://other.example.org/');
    render(<App />);
    expect(await screen.findByTestId('register-placeholder')).toBeTruthy();
  });

  it('opens the options page from the gear button', async () => {
    await seed();
    mockTab('https://example.com/');
    const open = vi.spyOn(fakeBrowser.runtime, 'openOptionsPage').mockResolvedValue(undefined as never);
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: t('openSettings') }));
    expect(open).toHaveBeenCalled();
  });
});
