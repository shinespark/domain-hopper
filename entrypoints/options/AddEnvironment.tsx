import { useState } from 'react';
import type { FormEvent } from 'react';
import { CHECK, CROSS, IconButton } from '@/components/Icon';
import { t } from '@/lib/i18n';
import type { OpResult } from '@/lib/projects';
import { buildOrigin } from '@/lib/url';
import type { Scheme } from '@/lib/url';
import { AddBlockButton, FieldError, labelInputClass, SchemeSelect } from './fields';

export default function AddEnvironment({
  onAdd,
}: {
  onAdd: (origin: string, label: string) => Promise<OpResult | null>;
}) {
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

  if (!open) return <AddBlockButton onClick={() => setOpen(true)}>{t('addEnvironment')}</AddBlockButton>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const origin = buildOrigin(scheme, host);
    if (!origin) {
      setMessage(t('invalidHost'));
      return;
    }
    const result = await onAdd(origin, name.trim());
    if (result?.ok) close();
    else if (result) setMessage(t('originTaken', result.projectName));
  };

  return (
    <form className="env add-env-form" aria-label={t('addEnvironment')} onSubmit={submit}>
      <div className="row">
        <input
          className={labelInputClass(3)}
          aria-label={t('environmentLabel')}
          placeholder={host.trim() || t('environmentLabel')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="actions">
          <IconButton type="submit" label={t('confirm')} path={CHECK} />
          <IconButton label={t('cancel')} path={CROSS} onClick={close} />
        </div>
      </div>
      <div className="origin-fields">
        <SchemeSelect value={scheme} onChange={setScheme} />
        <input
          className="text-input"
          aria-label={t('hostLabel')}
          placeholder="example.com"
          autoFocus
          value={host}
          onChange={(event) => setHost(event.target.value)}
        />
      </div>
      <FieldError message={message} />
    </form>
  );
}
