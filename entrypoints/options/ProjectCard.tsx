import { useEffect, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import {
  addEnvironment,
  moveEnvironment,
  moveProject,
  removeEnvironment,
  removeProject,
  renameEnvironment,
  renameProject,
} from '@/lib/projects';
import { changeOrigin } from '@/lib/projects';
import type { OpResult, Project } from '@/lib/projects';
import { buildOrigin } from '@/lib/url';
import type { Scheme } from '@/lib/url';
import type { useProjects } from '@/lib/use-projects';

type Update = ReturnType<typeof useProjects>['update'];

function EditableText({
  className = 'text-input',
  value,
  label,
  autoFocus,
  onCommit,
  onDone,
}: {
  className?: string;
  value: string;
  label: string;
  autoFocus?: boolean;
  onCommit: (next: string) => Promise<unknown>;
  onDone?: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = async () => {
    const next = draft?.trim();
    if (next && next !== value) await onCommit(next);
    setDraft(null);
    onDone?.();
  };

  return (
    <input
      className={className}
      aria-label={label}
      title={draft ?? value}
      value={draft ?? value}
      autoFocus={autoFocus}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur();
      }}
    />
  );
}

function OriginEditor({
  origin,
  onChange,
}: {
  origin: string;
  onChange: (next: string) => Promise<OpResult | null>;
}) {
  const { protocol, host } = new URL(origin);
  const scheme = protocol as Scheme;
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (nextScheme: Scheme, nextHost: string) => {
    setDraft(null);
    const next = buildOrigin(nextScheme, nextHost);
    if (!next) {
      setMessage(t('invalidHost'));
      return;
    }
    setMessage(null);
    if (next === origin) return;
    const result = await onChange(next);
    if (result && !result.ok) setMessage(t('originTaken', result.projectName));
  };

  return (
    <>
      <div className="origin-fields">
        <select
          className="scheme-select"
          aria-label={t('schemeLabel')}
          value={scheme}
          onChange={(event) => save(event.target.value as Scheme, host)}
        >
          <option value="https:">https://</option>
          <option value="http:">http://</option>
        </select>
        <input
          className="text-input"
          aria-label={t('hostLabel')}
          title={draft ?? host}
          value={draft ?? host}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft !== null) void save(scheme, draft);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur();
          }}
        />
      </div>
      {message && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}
    </>
  );
}

function ClickToEdit({
  level,
  value,
  label,
  onCommit,
}: {
  level: 2 | 3;
  value: string;
  label: string;
  onCommit: (next: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const Heading = level === 2 ? 'h2' : 'h3';

  if (editing) {
    return (
      <EditableText
        className={`text-input editable-input-${level}`}
        value={value}
        label={label}
        autoFocus
        onCommit={onCommit}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <Heading className={`editable-heading editable-heading-${level}`}>
      <button type="button" className="editable-button" title={t('clickToEdit')} onClick={() => setEditing(true)}>
        {value}
      </button>
    </Heading>
  );
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    cancelRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <h2 id="confirm-dialog-title" className="confirm-dialog-title">
        {title}
      </h2>
      <p>{message}</p>
      <div className="confirm-dialog-actions">
        <button ref={cancelRef} type="button" onClick={onCancel}>
          {t('cancel')}
        </button>
        <button type="button" className="danger" onClick={onConfirm}>
          {t('delete')}
        </button>
      </div>
    </dialog>
  );
}

function RowActions({
  index,
  count,
  confirmMessage,
  dialogTitle,
  onMove,
  onDelete,
}: {
  index: number;
  count: number;
  confirmMessage: string;
  dialogTitle?: string;
  onMove: (toIndex: number) => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming && dialogTitle === undefined) {
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
      {confirming && dialogTitle !== undefined && (
        <ConfirmDialog
          title={dialogTitle}
          message={confirmMessage}
          onConfirm={onDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function AddEnvironment({ onAdd }: { onAdd: (origin: string) => Promise<OpResult | null> }) {
  const [open, setOpen] = useState(false);
  const [scheme, setScheme] = useState<Scheme>('https:');
  const [host, setHost] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setScheme('https:');
    setHost('');
    setMessage(null);
  };

  if (!open) {
    return (
      <button type="button" className="add-environment" onClick={() => setOpen(true)}>
        <span aria-hidden="true">+ </span>
        {t('addEnvironment')}
      </button>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const origin = buildOrigin(scheme, host);
    if (!origin) {
      setMessage(t('invalidHost'));
      return;
    }
    const result = await onAdd(origin);
    if (!result) return;
    if (!result.ok) {
      setMessage(t('originTaken', result.projectName));
      return;
    }
    close();
  };

  return (
    <form className="add-environment-form" aria-label={t('addEnvironment')} onSubmit={submit}>
      <div className="origin-fields">
        <select
          className="scheme-select"
          aria-label={t('schemeLabel')}
          value={scheme}
          onChange={(event) => setScheme(event.target.value as Scheme)}
        >
          <option value="https:">https://</option>
          <option value="http:">http://</option>
        </select>
        <input
          className="text-input"
          aria-label={t('hostLabel')}
          placeholder="example.com"
          autoFocus
          value={host}
          onChange={(event) => setHost(event.target.value)}
        />
        <button type="submit">{t('confirm')}</button>
        <button type="button" onClick={close}>
          {t('cancel')}
        </button>
      </div>
      {message && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}
    </form>
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
        <ClickToEdit
          level={2}
          value={project.name}
          label={t('projectNameLabel')}
          onCommit={(name) => update((current) => renameProject(current, project.id, name))}
        />
        <RowActions
          index={index}
          count={count}
          confirmMessage={t('confirmDeleteProject')}
          dialogTitle={project.name}
          onMove={(toIndex) => update((current) => moveProject(current, project.id, toIndex))}
          onDelete={() => update((current) => removeProject(current, project.id))}
        />
      </div>
      <ul className="env-list">
        {project.environments.map((env, envIndex) => (
          <li key={env.id} className="env">
            <div className="row">
              <ClickToEdit
                level={3}
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
            <OriginEditor
              origin={env.origin}
              onChange={(origin) => update((current) => changeOrigin(current, project.id, env.id, origin))}
            />
          </li>
        ))}
      </ul>
      <AddEnvironment onAdd={(origin) => update((current) => addEnvironment(current, project.id, origin))} />
    </li>
  );
}
