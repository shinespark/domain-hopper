import { t } from '@/lib/i18n';
import {
  addEnvironment,
  changeOrigin,
  moveEnvironment,
  moveProject,
  removeEnvironment,
  removeProject,
  renameEnvironment,
  renameProject,
} from '@/lib/projects';
import type { Project } from '@/lib/projects';
import type { useProjects } from '@/lib/use-projects';
import AddEnvironment from './AddEnvironment';
import { ClickToEdit } from './fields';
import OriginEditor from './OriginEditor';
import RowActions from './RowActions';

export default function ProjectCard({
  project,
  index,
  count,
  update,
}: {
  project: Project;
  index: number;
  count: number;
  update: ReturnType<typeof useProjects>['update'];
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
          onMove={(toIndex) => update((current) => moveProject(current, project.id, toIndex))}
          onDelete={() => {
            if (window.confirm(t('confirmDeleteProject', project.name))) {
              void update((current) => removeProject(current, project.id));
            }
          }}
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
      <AddEnvironment
        onAdd={(origin, label) => update((current) => addEnvironment(current, project.id, origin, label))}
      />
    </li>
  );
}
