import type { ButtonHTMLAttributes } from 'react';

export const CHECK = 'M5 12l5 5 9-10';
export const CROSS = 'M6 6l12 12M18 6L6 18';
export const UP = 'M6 15l6-6 6 6';
export const DOWN = 'M6 9l6 6 6-6';
export const TRASH = 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3';

export function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export function IconButton({
  label,
  path,
  className = 'icon-button',
  ...props
}: { label: string; path: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={className} aria-label={label} title={label} {...props}>
      <Icon path={path} />
    </button>
  );
}
