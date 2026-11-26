import type en from '../public/_locales/en/messages.json';

export type MessageKey = keyof typeof en;

type GetMessage = (key: string, substitutions?: string | string[]) => string;

export function t(key: MessageKey, substitutions?: string | string[]): string {
  return (browser.i18n.getMessage as GetMessage)(key, substitutions);
}
