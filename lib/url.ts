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
  return toUnicodeHost(new URL(origin).host);
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

const BASE = 36;
const T_MIN = 1;
const T_MAX = 26;

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  let d = firstTime ? Math.floor(delta / 700) : delta >> 1;
  d += Math.floor(d / numPoints);
  let k = 0;
  while (d > ((BASE - T_MIN) * T_MAX) >> 1) {
    d = Math.floor(d / (BASE - T_MIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - T_MIN + 1) * d) / (d + 38));
}

function digitOf(code: number): number {
  if (code >= 48 && code < 58) return code - 22;
  if (code >= 65 && code < 91) return code - 65;
  if (code >= 97 && code < 123) return code - 97;
  return BASE;
}

function decodePunycode(input: string): string | null {
  const output: number[] = [];
  const delimiter = input.lastIndexOf('-');
  for (let j = 0; j < Math.max(delimiter, 0); j++) {
    const code = input.charCodeAt(j);
    if (code >= 0x80) return null;
    output.push(code);
  }
  let n = 128;
  let bias = 72;
  let i = 0;
  for (let index = delimiter >= 0 ? delimiter + 1 : 0; index < input.length; ) {
    const oldI = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (index >= input.length) return null;
      const digit = digitOf(input.charCodeAt(index++));
      if (digit >= BASE) return null;
      i += digit * w;
      const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    const length = output.length + 1;
    bias = adapt(i - oldI, length, oldI === 0);
    n += Math.floor(i / length);
    i %= length;
    if (n > 0x10ffff) return null;
    output.splice(i, 0, n);
    i++;
  }
  return output.length > 0 ? String.fromCodePoint(...output) : null;
}

export function toUnicodeHost(host: string): string {
  if (host.startsWith('[')) return host;
  const colon = host.lastIndexOf(':');
  const hostname = colon >= 0 ? host.slice(0, colon) : host;
  const port = colon >= 0 ? host.slice(colon) : '';
  const labels = hostname
    .split('.')
    .map((label) => (label.toLowerCase().startsWith('xn--') ? (decodePunycode(label.slice(4)) ?? label) : label));
  return labels.join('.') + port;
}
