import { expect, test } from 'vitest';
import { buildSwitchedUrl, defaultLabel, toOrigin } from '../lib/url';

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
