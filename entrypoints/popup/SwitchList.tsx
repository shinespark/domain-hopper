import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { Project } from '@/lib/projects';
import type { ActiveTab } from '@/lib/tabs';
import { openInTab } from '@/lib/tabs';
import { buildSwitchedUrl, displayHost } from '@/lib/url';

type Props = { project: Project; tab: ActiveTab; currentOrigin: string };

export default function SwitchList({ project, tab, currentOrigin }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const index = project.environments.findIndex((e) => e.origin === currentOrigin);
    refs.current[Math.max(index, 0)]?.focus();
  }, [project, currentOrigin]);

  const go = (origin: string, inNewTab: boolean) => {
    void openInTab(tab, buildSwitchedUrl(tab.url, origin), inNewTab);
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = project.environments.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowDown') next = Math.min(index + 1, last);
    else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    refs.current[next]?.focus();
  };

  return (
    <section>
      <h2 className="project-name" title={project.name}>
        {project.name}
      </h2>
      <ul className="env-list">
        {project.environments.map((env, i) => {
          const host = displayHost(env.origin);
          return (
            <li key={env.id}>
              <button
                type="button"
                className="env-row"
                aria-current={env.origin === currentOrigin ? 'true' : undefined}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                onClick={(e) => go(env.origin, e.metaKey || e.ctrlKey)}
                onAuxClick={(e) => {
                  if (e.button === 1) go(env.origin, true);
                }}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span className="env-label" title={env.label}>
                  {env.label}
                </span>
                <span className="env-host" title={host}>
                  {host}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
