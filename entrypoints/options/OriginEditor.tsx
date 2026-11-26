import { useState } from 'react';
import { t } from '@/lib/i18n';
import type { OpResult } from '@/lib/projects';
import { buildOrigin, displayHost } from '@/lib/url';
import type { Scheme } from '@/lib/url';
import { blurOnEnter, FieldError, SchemeSelect } from './fields';

export default function OriginEditor({
  origin,
  onChange,
}: {
  origin: string;
  onChange: (next: string) => Promise<OpResult | null>;
}) {
  const scheme = new URL(origin).protocol as Scheme;
  const host = displayHost(origin);
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
        <SchemeSelect value={scheme} onChange={(next) => save(next, host)} />
        <input
          className="text-input"
          aria-label={t('hostLabel')}
          title={draft ?? host}
          value={draft ?? host}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft !== null) void save(scheme, draft);
          }}
          onKeyDown={blurOnEnter}
        />
      </div>
      <FieldError message={message} />
    </>
  );
}
