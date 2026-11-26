import { useState } from 'react';
import type { FormEvent } from 'react';
import { t } from '@/lib/i18n';
import { addEnvironment, createProject } from '@/lib/projects';
import type { OpResult, Project } from '@/lib/projects';
import { defaultLabel } from '@/lib/url';
import type { useProjects } from '@/lib/use-projects';

type Props = {
  origin: string;
  projects: Project[];
  update: ReturnType<typeof useProjects>['update'];
};

export default function RegisterPanel({ origin, projects, update }: Props) {
  const host = defaultLabel(origin);
  const [mode, setMode] = useState<'create' | 'add' | null>(null);
  const [name, setName] = useState(host);
  const [targetId, setTargetId] = useState(projects[0]?.id ?? '');
  const [taken, setTaken] = useState<string | null>(null);

  const target = projects.some((p) => p.id === targetId) ? targetId : (projects[0]?.id ?? '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result: OpResult | null = await update((current) =>
      mode === 'create' ? createProject(current, name.trim(), origin) : addEnvironment(current, target, origin),
    );
    if (result && !result.ok) setTaken(result.projectName);
  };

  return (
    <section>
      <h2 className="register-origin" title={host}>
        {host}
      </h2>
      <div className="register-actions">
        <button type="button" className="action" aria-pressed={mode === 'create'} onClick={() => setMode('create')}>
          {t('createProject')}
        </button>
        {projects.length > 0 && (
          <button type="button" className="action" aria-pressed={mode === 'add'} onClick={() => setMode('add')}>
            {t('addToExisting')}
          </button>
        )}
      </div>
      {mode && (
        <form className="register-form" onSubmit={submit}>
          {mode === 'create' ? (
            <input
              className="field"
              aria-label={t('projectNameLabel')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          ) : (
            <select
              className="field"
              aria-label={t('addToExisting')}
              value={target}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} title={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="action" disabled={mode === 'create' ? name.trim() === '' : target === ''}>
            {t('confirm')}
          </button>
        </form>
      )}
      {taken !== null && (
        <p className="error" role="alert">
          {t('originTaken', taken)}
        </p>
      )}
    </section>
  );
}
