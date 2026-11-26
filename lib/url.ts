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
