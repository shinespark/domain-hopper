import { useState } from 'react';
import { CHECK, CROSS, Icon } from '@/components/Icon';
import { t } from '@/lib/i18n';
import { addProject } from '@/lib/projects';
import type { useProjects } from '@/lib/use-projects';

export default function AddProject({ update }: { update: ReturnType<typeof useProjects>['update'] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const trimmed = name.trim();

  const close = () => {
    setOpen(false);
    setName('');
  };

  if (!open) {
    return (
      <button type="button" className="add-block" onClick={() => setOpen(true)}>
        <span aria-hidden="true">+ </span>
        {t('addProject')}
      </button>
    );
  }

  return (
    <form
      className="add-block-form add-project-form"
      aria-label={t('addProject')}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!trimmed) return;
        const result = await update((current) => addProject(current, trimmed));
        if (result) close();
      }}
    >
      <input
        className="text-input"
        aria-label={t('projectNameLabel')}
        placeholder={t('projectNameLabel')}
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="actions">
        <button type="submit" className="icon-button" aria-label={t('confirm')} title={t('confirm')} disabled={!trimmed}>
          <Icon path={CHECK} />
        </button>
        <button type="button" className="icon-button" aria-label={t('cancel')} title={t('cancel')} onClick={close}>
          <Icon path={CROSS} />
        </button>
      </div>
    </form>
  );
}
