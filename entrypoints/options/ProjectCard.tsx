import { useState } from 'react';
import { t } from '@/lib/i18n';
import {
  moveEnvironment,
  moveProject,
  removeEnvironment,
  removeProject,
  renameEnvironment,
  renameProject,
} from '@/lib/projects';
import type { Project } from '@/lib/projects';
import type { useProjects } from '@/lib/use-projects';

type Update = ReturnType<typeof useProjects>['update'];

function EditableText({
  value,
  label,
  onCommit,
}: {
  value: string;
  label: string;
  onCommit: (next: string) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = async () => {
    if (draft === null) return;
    const next = draft.trim();
    if (next && next !== value) await onCommit(next);
    setDraft(null);
  };

  return (
    <input
      className="text-input"
      aria-label={label}
      title={draft ?? value}
      value={draft ?? value}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur();
      }}
    />
  );
}

function RowActions({
  index,
  count,
  confirmMessage,
  onMove,
  onDelete,
}: {
  index: number;
  count: number;
  confirmMessage: string;
  onMove: (toIndex: number) => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="actions" role="group" aria-label={confirmMessage}>
        <span className="confirm-message">{confirmMessage}</span>
        <button type="button" className="danger" onClick={onDelete}>
          {t('delete')}
        </button>
        <button type="button" onClick={() => setConfirming(false)}>
          {t('cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="actions">
      <button
        type="button"
        className="icon-button"
        aria-label={t('moveUp')}
        title={t('moveUp')}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
      >
        ↑
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={t('moveDown')}
        title={t('moveDown')}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
      >
        ↓
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={t('delete')}
        title={t('delete')}
        onClick={() => setConfirming(true)}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </svg>
      </button>
    </div>
  );
}

export default function ProjectCard({
  project,
  index,
  count,
  update,
}: {
  project: Project;
  index: number;
  count: number;
  update: Update;
}) {
  return (
    <li className="project">
      <div className="row">
        <EditableText
          value={project.name}
          label={t('projectNameLabel')}
          onCommit={(name) => update((current) => renameProject(current, project.id, name))}
        />
        <RowActions
          index={index}
          count={count}
          confirmMessage={t('confirmDeleteProject')}
          onMove={(toIndex) => update((current) => moveProject(current, project.id, toIndex))}
          onDelete={() => update((current) => removeProject(current, project.id))}
        />
      </div>
      <ul className="env-list">
        {project.environments.map((env, envIndex) => (
          <li key={env.id} className="env">
            <div className="row">
              <EditableText
                value={env.label}
                label={t('environmentLabel')}
                onCommit={(label) => update((current) => renameEnvironment(current, project.id, env.id, label))}
              />
              <RowActions
                index={envIndex}
                count={project.environments.length}
                confirmMessage={t('confirmDeleteEnvironment')}
                onMove={(toIndex) => update((current) => moveEnvironment(current, project.id, env.id, toIndex))}
                onDelete={() => update((current) => removeEnvironment(current, project.id, env.id))}
              />
            </div>
            <span className="origin">{env.origin}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
