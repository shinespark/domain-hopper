import { useCallback, useEffect, useState } from 'react';
import { t } from './i18n';
import type { OpResult, Project } from './projects';
import { loadProjects, updateProjects, watchProjects } from './storage';

export function useProjects(): {
  projects: Project[] | null;
  error: string | null;
  update: (op: (current: Project[]) => OpResult | Project[]) => Promise<OpResult | null>;
} {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadProjects().then((loaded) => {
      if (active) setProjects(loaded);
    });
    const unwatch = watchProjects((latest) => {
      if (active) setProjects(latest);
    });
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  const update = useCallback(async (op: (current: Project[]) => OpResult | Project[]) => {
    try {
      const result = await updateProjects(op);
      setError(null);
      return result;
    } catch {
      setError(t('errorSaveFailed'));
      return null;
    }
  }, []);

  return { projects, error, update };
}
