# Domain Hopper

A Chrome extension that switches the current tab to another environment of the same site (production, staging, local), keeping the path, query and hash.

## Features

- Register the current page as a project, or add it to an existing project as another environment.
- Click an environment in the popup to switch the current tab.
- Cmd/Ctrl-click or middle-click to open it in a background tab to the right of the current one.
- On the options page (gear icon in the popup), add environments, change their scheme and host, and rename, reorder or delete projects and environments.
- English and Japanese UI.

## Usage

1. Open a page and click the toolbar button.
2. Register it as a new project, or add it to an existing one. Repeat for each environment.
3. From any registered page, click another environment to jump there with the same path.
4. Open the settings page from the gear icon to add environments, change a scheme or host, rename, reorder or delete.

## Permissions and privacy

- `activeTab`: reads the current tab's URL only when you press the toolbar button.
- `storage`: saves your projects in `chrome.storage.sync`.

No network requests are made. See [PRIVACY.md](PRIVACY.md). Store listing text is in `docs/store/`.

## Development

```sh
npm install
npm run dev      # start with hot reload
npm test         # run the tests
npm run zip      # build the zip for the Chrome Web Store
```

## 日本語

今のタブを、パス・クエリ・ハッシュはそのままで同じサイトの別の環境（本番・ステージング・ローカル）に切り替える Chrome 拡張機能です。

- 今のページをプロジェクトとして登録するか、既存のプロジェクトに環境として追加します。
- ポップアップで環境をクリックすると切り替わります。Cmd/Ctrl を押しながらクリックするか中クリックすると、今のタブの右隣にバックグラウンドで開きます。
- 歯車アイコンから開く設定ページで、環境の追加、スキームやホストの変更、プロジェクトと環境の名前変更・並べ替え・削除ができます。
- 権限は `activeTab` と `storage` だけです。通信は一切行いません。詳しくは [PRIVACY.md](PRIVACY.md) を参照してください。
