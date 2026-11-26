import { describe, expect, test } from 'vitest';
import { buildOrigin, buildSwitchedUrl, defaultLabel, toOrigin, toUnicodeHost } from '../lib/url';

test.each([
  ['https://example.com/a?b=1#c', 'https://example.com'],
  ['https://Example.COM:443/', 'https://example.com'],
  ['http://localhost:3000/x', 'http://localhost:3000'],
  ['http://localhost:80/', 'http://localhost'],
  ['http://[::1]:3000/', 'http://[::1]:3000'],
  ['http://127.0.0.1:8080/', 'http://127.0.0.1:8080'],
  ['https://chromewebstore.google.com/detail/x', 'https://chromewebstore.google.com'],
])('toOrigin(%s) は %s', (url, origin) => expect(toOrigin(url)).toBe(origin));

test.each(['chrome://extensions', 'file:///tmp/a.html', 'about:blank', 'view-source:https://example.com', 'not a url', ''])(
  'toOrigin(%s) は null', (url) => expect(toOrigin(url)).toBeNull());

test('defaultLabel はポートを含むホスト', () => {
  expect(defaultLabel('http://localhost:3000')).toBe('localhost:3000');
  expect(defaultLabel('https://stg1.example.com')).toBe('stg1.example.com');
});

test('buildSwitchedUrl はパス・クエリ・ハッシュを引き継ぐ', () => {
  expect(buildSwitchedUrl('https://example.com/a/b?x=1&y=2#top', 'http://localhost:3000'))
    .toBe('http://localhost:3000/a/b?x=1&y=2#top');
  expect(buildSwitchedUrl('http://localhost:3000/', 'https://example.com'))
    .toBe('https://example.com/');
});

describe('buildOrigin', () => {
  test.each([
    ['https:', 'example.com', 'https://example.com'],
    ['http:', 'localhost:3000', 'http://localhost:3000'],
    ['https:', ' Admin.Example.com ', 'https://admin.example.com'],
    ['https:', 'example.com:443', 'https://example.com'],
    ['http:', '[::1]:8080', 'http://[::1]:8080'],
  ] as const)('buildOrigin(%s, %s) は %s', (scheme, host, origin) => expect(buildOrigin(scheme, host)).toBe(origin));

  test.each(['', '   ', 'example.com/path', 'example.com?x=1', 'example.com#a', 'user@example.com', 'exa mple.com', 'https://example.com'])(
    'buildOrigin(https:, %s) は null',
    (host) => expect(buildOrigin('https:', host)).toBeNull(),
  );
});

describe('toUnicodeHost', () => {
  test.each([
    ['xn--l8jaa', 'あああ'],
    ['xn--wgv71a119e.jp:8080', '日本語.jp:8080'],
    ['xn--mnchen-3ya.de', 'münchen.de'],
    ['admin.xn--wgv71a119e.jp', 'admin.日本語.jp'],
    ['example.com', 'example.com'],
    ['localhost:3000', 'localhost:3000'],
    ['[::1]:3000', '[::1]:3000'],
    ['xn--', 'xn--'],
    ['xn--a-?', 'xn--a-?'],
  ])('toUnicodeHost(%s) は %s', (host, expected) => expect(toUnicodeHost(host)).toBe(expected));

  test('日本語ドメインは入力から origin を作り、表示用に戻せる', () => {
    const origin = buildOrigin('https:', '日本語.jp')!;
    expect(origin).toBe('https://xn--wgv71a119e.jp');
    expect(defaultLabel(origin)).toBe('日本語.jp');
  });
});
