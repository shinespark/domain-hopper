import { useState } from 'react';
import { CHECK, CROSS, IconButton } from '@/components/Icon';
import { t } from '@/lib/i18n';
import { addProject } from '@/lib/projects';
import type { useProjects } from '@/lib/use-projects';
import { AddBlockButton } from './fields';

export default function AddProject({ update }: { update: ReturnType<typeof useProjects>['update'] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const trimmed = name.trim();

  const close = () => {
    setOpen(false);
    setName('');
  };

  if (!open) return <AddBlockButton onClick={() => setOpen(true)}>{t('addProject')}</AddBlockButton>;

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
        <IconButton type="submit" label={t('confirm')} path={CHECK} disabled={!trimmed} />
        <IconButton label={t('cancel')} path={CROSS} onClick={close} />
      </div>
    </form>
  );
}
