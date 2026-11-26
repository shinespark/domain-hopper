import { defineConfig } from 'wxt';

export default defineConfig({
  vite: () => ({ build: { modulePreload: { polyfill: false } } }),
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['activeTab', 'storage'],
    action: { default_title: '__MSG_extName__' },
  },
});
