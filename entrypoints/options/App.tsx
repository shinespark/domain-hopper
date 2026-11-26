import { useEffect } from 'react';
import { t } from '@/lib/i18n';
import { useProjects } from '@/lib/use-projects';
import AddProject from './AddProject';
import ProjectCard from './ProjectCard';
import '@/assets/common.css';
import './style.css';

export default function App() {
  const { projects, error, update } = useProjects();

  useEffect(() => {
    document.title = t('optionsTitle');
  }, []);

  return (
    <main className="options">
      <header className="page-header">
        <h1>{t('extName')}</h1>
        <p className="page-description">{t('optionsDescription')}</p>
      </header>
      {error && <p role="alert" className="error">{error}</p>}
      {projects && projects.length === 0 && <p>{t('noProjects')}</p>}
      {projects && projects.length > 0 && (
        <ul className="project-list">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              count={projects.length}
              update={update}
            />
          ))}
        </ul>
      )}
      {projects && <AddProject update={update} />}
    </main>
  );
}
