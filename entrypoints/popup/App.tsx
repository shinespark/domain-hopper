import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { findProjectByOrigin } from '@/lib/projects';
import { getActiveTab } from '@/lib/tabs';
import type { ActiveTab } from '@/lib/tabs';
import { toOrigin } from '@/lib/url';
import { useProjects } from '@/lib/use-projects';
import Header from './Header';
import SwitchList from './SwitchList';
import './style.css';

export default function App() {
  const { projects, error } = useProjects();
  const [tab, setTab] = useState<ActiveTab | null | undefined>(undefined);

  useEffect(() => {
    getActiveTab().then(setTab, () => setTab(null));
  }, []);

  if (projects === null || tab === undefined) return null;

  const origin = tab ? toOrigin(tab.url) : null;
  const project = origin ? findProjectByOrigin(projects, origin) : undefined;

  let body;
  if (!tab || !origin) {
    body = <p className="message">{t('unsupportedPage')}</p>;
  } else if (project && project.environments.length > 0) {
    body = <SwitchList project={project} tab={tab} currentOrigin={origin} />;
  } else {
    body = <div data-testid="register-placeholder" />;
  }

  return (
    <main className="popup">
      <Header title={t('extName')} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {body}
    </main>
  );
}
