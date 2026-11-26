export function toOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function defaultLabel(origin: string): string {
  return new URL(origin).host;
}

export function buildSwitchedUrl(currentUrl: string, targetOrigin: string): string {
  const { pathname, search, hash } = new URL(currentUrl);
  return targetOrigin + pathname + search + hash;
}

export type Scheme = 'http:' | 'https:';

export function buildOrigin(scheme: Scheme, host: string): string | null {
  const trimmed = host.trim();
  if (!trimmed || /[\s/?#@\\]/.test(trimmed)) return null;
  return toOrigin(`${scheme}//${trimmed}`);
}
