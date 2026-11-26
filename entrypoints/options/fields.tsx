import { useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { t } from '@/lib/i18n';
import type { Scheme } from '@/lib/url';

export function blurOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur();
}

export const labelInputClass = (level: 2 | 3) => `text-input editable-input-${level}`;

export function EditableText({
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
      onKeyDown={blurOnEnter}
    />
  );
}

export function ClickToEdit({
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
        className={labelInputClass(level)}
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

export function SchemeSelect({ value, onChange }: { value: Scheme; onChange: (scheme: Scheme) => void }) {
  return (
    <span className="select-wrap">
      <select
        className="scheme-select"
        aria-label={t('schemeLabel')}
        value={value}
        onChange={(event) => onChange(event.target.value as Scheme)}
      >
        <option value="https:">https://</option>
        <option value="http:">http://</option>
      </select>
    </span>
  );
}

export function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="field-error" role="alert">
      {message}
    </p>
  );
}

export function AddBlockButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="add-block" onClick={onClick}>
      <span aria-hidden="true">+ </span>
      {children}
    </button>
  );
}
