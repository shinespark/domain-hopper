import { useState } from 'react';
import { CHECK, CROSS, Icon } from '@/components/Icon';
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
import { buildOrigin, toUnicodeHost } from '@/lib/url';
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
  const url = new URL(origin);
  const protocol = url.protocol;
  const host = toUnicodeHost(url.host);
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
        <span className="select-wrap">
          <select
            className="scheme-select"
            aria-label={t('schemeLabel')}
            value={scheme}
            onChange={(event) => save(event.target.value as Scheme, host)}
          >
            <option value="https:">https://</option>
            <option value="http:">http://</option>
          </select>
        </span>
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

function RowActions({
  index,
  count,
  confirmDelete,
  onMove,
  onDelete,
}: {
  index: number;
  count: number;
  confirmDelete?: () => boolean;
  onMove: (toIndex: number) => void;
  onDelete: () => void;
}) {
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
        <Icon path="M6 15l6-6 6 6" />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={t('moveDown')}
        title={t('moveDown')}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
      >
        <Icon path="M6 9l6 6 6-6" />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={t('delete')}
        title={t('delete')}
        onClick={() => {
          if (!confirmDelete || confirmDelete()) onDelete();
        }}
      >
        <Icon path="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </button>
    </div>
  );
}

function AddEnvironment({ onAdd }: { onAdd: (origin: string, label: string) => Promise<OpResult | null> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [scheme, setScheme] = useState<Scheme>('https:');
  const [host, setHost] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setName('');
    setScheme('https:');
    setHost('');
    setMessage(null);
  };

  if (!open) {
    return (
      <button type="button" className="add-block" onClick={() => setOpen(true)}>
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
    const result = await onAdd(origin, name.trim());
    if (!result) return;
    if (!result.ok) {
      setMessage(t('originTaken', result.projectName));
      return;
    }
    close();
  };

  return (
    <form className="env add-env-form" aria-label={t('addEnvironment')} onSubmit={submit}>
      <div className="row">
        <input
          className="text-input editable-input-3"
          aria-label={t('environmentLabel')}
          placeholder={host.trim() || t('environmentLabel')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="actions">
          <button type="submit" className="icon-button" aria-label={t('confirm')} title={t('confirm')}>
            <Icon path={CHECK} />
          </button>
          <button type="button" className="icon-button" aria-label={t('cancel')} title={t('cancel')} onClick={close}>
            <Icon path={CROSS} />
          </button>
        </div>
      </div>
      <div className="origin-fields">
        <span className="select-wrap">
          <select
            className="scheme-select"
            aria-label={t('schemeLabel')}
            value={scheme}
            onChange={(event) => setScheme(event.target.value as Scheme)}
          >
            <option value="https:">https://</option>
            <option value="http:">http://</option>
          </select>
        </span>
        <input
          className="text-input"
          aria-label={t('hostLabel')}
          placeholder="example.com"
          autoFocus
          value={host}
          onChange={(event) => setHost(event.target.value)}
        />
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
          confirmDelete={() => window.confirm(t('confirmDeleteProject', project.name))}
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
      <AddEnvironment onAdd={(origin, label) => update((current) => addEnvironment(current, project.id, origin, label))} />
    </li>
  );
}
