import { expect, test } from 'vitest';
import en from '../public/_locales/en/messages.json';
import ja from '../public/_locales/ja/messages.json';

test('en と ja のキーが一致する', () => {
  expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
});

test('すべてのメッセージに空でない message がある', () => {
  for (const m of [...Object.values(en), ...Object.values(ja)]) {
    expect(m.message.trim()).not.toBe('');
  }
});
