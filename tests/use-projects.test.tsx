import { renderHook, waitFor, act } from '@testing-library/react';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '../lib/i18n';
import { createProject, renameProject } from '../lib/projects';
import { updateProjects } from '../lib/storage';
import { useProjects } from '../lib/use-projects';

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
  vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation(((key: string) => `msg:${key}`) as never);
});

describe('useProjects', () => {
  it('keeps projects and sets error when a write fails, then clears it on success', async () => {
    await updateProjects((p) => createProject(p, 'A', 'https://a.example.com'));
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    const before = result.current.projects;
    const id = before![0]!.id;

    const set = vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValueOnce(new Error('quota'));
    let failed: unknown;
    await act(async () => {
      failed = await result.current.update((p) => renameProject(p, id, 'x'));
    });
    expect(failed).toBeNull();
    expect(result.current.error).toBe(t('errorSaveFailed'));
    expect(result.current.projects).toEqual(before);

    set.mockRestore();
    await act(async () => {
      await result.current.update((p) => renameProject(p, id, 'x'));
    });
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.projects![0]!.name).toBe('x'));
  });

  it('sets errorLoadFailed and falls back to [] when the initial load fails', async () => {
    vi.spyOn(fakeBrowser.storage.sync, 'get').mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.projects).toEqual([]));
    expect(result.current.error).toBe(t('errorLoadFailed'));
  });
});
