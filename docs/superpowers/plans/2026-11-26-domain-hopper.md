# domain-hopper 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 今開いているページを、パス・クエリ・ハッシュはそのままで同じプロジェクトの別環境へ切り替える Chrome 拡張を、Chrome Web Store に提出できる状態まで作る。

**Architecture:** WXT で popup と options の 2 つの entrypoint を持つ MV3 拡張を作る。URL の扱いとプロジェクトの操作は `lib/` の純粋関数にまとめて Vitest で固め、`chrome.storage.sync` への読み書きは `lib/storage.ts` に閉じ込める。UI（React）は「純粋関数で次の状態を作り、storage に保存し、`onChanged` で再描画する」流れだけを持つ。

**Tech Stack:** WXT、TypeScript、React、Vitest、@testing-library/react、happy-dom、npm

**Spec:** `docs/superpowers/specs/2026-11-26-domain-hopper-design.md`

## Global Constraints

- Manifest V3。`permissions` は `["activeTab", "storage"]` のみ。`host_permissions` と `tabs` 権限は持たない
- 外部への通信を一切しない。フォント・アイコン・画像はすべてパッケージに同梱する。解析やエラー送信のライブラリを入れない
- 保存先は `chrome.storage.sync`。プロジェクトごとに 1 項目（キー `project:<id>`）、並び順は 1 項目（キー `projectOrder`、値は `string[]`）
- 1 つの `origin` は 1 つのプロジェクトにしか属さない
- `origin` は `new URL(x).origin` と同じ形（スキーム・ホストは小文字、デフォルトポートは省く）。対象は `http:` と `https:` のみ
- UI の文言はすべて `_locales/en` と `_locales/ja` から取る。`default_locale` は `en`
- ポップアップは固定幅。長いラベル・ドメイン・プロジェクト名は 1 行で末尾を「…」にし、全体を `title` 属性で見せる。どんな長さでもはみ出さない
- ID は `crypto.randomUUID()`
- コメントは原則書かない（非自明な回避策や外部仕様による制約のみ）
- ドキュメントにツールやライブラリのバージョン番号を書かない

## Review Focus

- **古い状態からの上書き**: 管理ページを開いたまま別の Chrome で編集が同期されてきた直後に操作しても、同期された変更が消えないこと → Task 4 の `updateProjects` は毎回 storage から最新を読んでから操作を当てる。テストを Task 4 に追加済み
- **storage への書き込み失敗**: `chrome.storage.sync` の容量上限や書き込み回数上限（1 分あたり 120 回）で `set` が失敗したとき、画面が固まらず、エラーの文言が出て、表示は保存済みの状態のままであること → Task 4 にテスト、Task 5・7 で表示
- **表記揺れした URL**: `https://Example.com:443/` と `https://example.com` が同じ行き先として扱われること → Task 2 のテスト
- **http(s) 以外のページ**: `chrome://`、`file://`、`about:blank`、`view-source:`、Chrome Web Store（`https://chromewebstore.google.com`、拡張がスクリプトを動かせないがタブの書き換えは可能）で開いたとき。前の 3 つと `view-source:` は「このページでは使えません」、Chrome Web Store は通常のページとして扱う → Task 2 と Task 5 のテスト
- **IPv6 とポート付きローカル**: `http://[::1]:3000` や `http://127.0.0.1:8080` を登録・切り替えできること → Task 2 のテスト

---

### Task 1: プロジェクトの土台と多言語の骨組み

**Files:**
- Create: `package.json`、`wxt.config.ts`、`tsconfig.json`、`vitest.config.ts`、`.gitignore`
- Create: `entrypoints/popup/index.html`、`entrypoints/popup/main.tsx`、`entrypoints/popup/App.tsx`
- Create: `entrypoints/options/index.html`、`entrypoints/options/main.tsx`、`entrypoints/options/App.tsx`
- Create: `public/_locales/en/messages.json`、`public/_locales/ja/messages.json`
- Create: `lib/i18n.ts`
- Test: `tests/locales.test.ts`

**Interfaces:**
- Produces: `t(key: MessageKey, substitutions?: string | string[]): string`（`lib/i18n.ts`。`browser.i18n.getMessage` の薄いラッパー）。`MessageKey` は `public/_locales/en/messages.json` のキーの文字列リテラル型
- Produces: `npm test`（Vitest）、`npm run build`、`npm run zip`

- [ ] **Step 1: WXT の React テンプレートで初期化する**

`npx wxt@latest init . --template react --pm npm` を実行し、生成されたサンプル（カウンターやロゴ、`entrypoints/background.ts`、`entrypoints/content.ts`）は削除する。background と content script は作らない。popup と options の `App.tsx` は、`t('extName')` を表示するだけにしておく。

- [ ] **Step 2: `wxt.config.ts` に manifest を書く**

```ts
manifest: {
  name: '__MSG_extName__',
  description: '__MSG_extDescription__',
  default_locale: 'en',
  permissions: ['activeTab', 'storage'],
  action: { default_title: '__MSG_extName__' },
}
```

options は `entrypoints/options/index.html` に `<meta name="manifest.open_in_tab" content="true" />` を入れて新しいタブで開く。

- [ ] **Step 3: Vitest を設定する**

`npm i -D vitest @testing-library/react @testing-library/user-event happy-dom` を入れる。`vitest.config.ts` は WXT のドキュメント「Unit Testing」のとおり `WxtVitest()` プラグインを使い、`environment: 'happy-dom'` にする。`package.json` に `"test": "vitest run"` を足す。

- [ ] **Step 4: ロケールのキーがそろっていることを確かめるテストを書く**

```ts
test('en と ja のキーが一致する', () => {
  expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
});
test('すべてのメッセージに空でない message がある', () => {
  for (const m of [...Object.values(en), ...Object.values(ja)]) {
    expect(m.message.trim()).not.toBe('');
  }
});
```

- [ ] **Step 5: テストが失敗することを確認する**

Run: `npm test -- tests/locales.test.ts`
Expected: FAIL（messages.json がまだない）

- [ ] **Step 6: `messages.json` を両言語で作る**

この時点では `extName`（`domain-hopper`）と `extDescription`（en: `Switch the current page to another environment, keeping the same path.` / ja: `今のページを、パスはそのままで別の環境に切り替えます。`）だけ。以降のタスクで文言を足すたびに両方へ足す。`lib/i18n.ts` を作る。

- [ ] **Step 7: テストとビルドを通す**

Run: `npm test && npm run build && jq '{permissions, host_permissions, default_locale}' .output/chrome-mv3/manifest.json`
Expected: テストが PASS。`permissions` が `["activeTab","storage"]`、`host_permissions` が `null`、`default_locale` が `"en"`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "WXT と React で拡張の土台を作る"
```

---

### Task 2: URL の扱い

**Files:**
- Create: `lib/url.ts`
- Test: `tests/url.test.ts`

**Interfaces:**
- Produces: `toOrigin(url: string): string | null` — `http:` / `https:` なら `new URL(url).origin`、それ以外と不正な文字列は `null`
- Produces: `defaultLabel(origin: string): string` — `new URL(origin).host`（ポート付きならポートも含む）
- Produces: `buildSwitchedUrl(currentUrl: string, targetOrigin: string): string` — `targetOrigin + pathname + search + hash`

- [ ] **Step 1: 失敗するテストを書く**

```ts
test.each([
  ['https://example.com/a?b=1#c', 'https://example.com'],
  ['https://Example.COM:443/', 'https://example.com'],
  ['http://localhost:3000/x', 'http://localhost:3000'],
  ['http://localhost:80/', 'http://localhost'],
  ['http://[::1]:3000/', 'http://[::1]:3000'],
  ['http://127.0.0.1:8080/', 'http://127.0.0.1:8080'],
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
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test -- tests/url.test.ts`
Expected: FAIL（`lib/url.ts` がない）

- [ ] **Step 3: `lib/url.ts` を実装する**

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test -- tests/url.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/url.ts tests/url.test.ts
git commit -m "URL から origin を取り出し、切り替え先の URL を組み立てる処理を追加"
```

---

### Task 3: プロジェクトの操作（純粋関数）

**Files:**
- Create: `lib/projects.ts`
- Test: `tests/projects.test.ts`

**Interfaces:**
- Produces（型）:
  ```ts
  type Environment = { id: string; label: string; origin: string };
  type Project = { id: string; name: string; environments: Environment[] };
  type OpResult = { ok: true; projects: Project[] } | { ok: false; reason: 'origin-taken'; projectName: string };
  ```
- Produces（関数。すべて元の配列を変更せず新しい配列を返す）:
  - `findProjectByOrigin(projects: Project[], origin: string): Project | undefined`
  - `createProject(projects: Project[], name: string, origin: string): OpResult` — 末尾に追加。最初の行き先のラベルは `defaultLabel(origin)`
  - `addEnvironment(projects: Project[], projectId: string, origin: string): OpResult` — 対象プロジェクトの末尾に追加
  - `renameProject(projects, projectId, name): Project[]`
  - `removeProject(projects, projectId): Project[]`
  - `moveProject(projects, projectId, toIndex: number): Project[]`
  - `renameEnvironment(projects, projectId, envId, label): Project[]`
  - `removeEnvironment(projects, projectId, envId): Project[]` — 最後の 1 つを消してもプロジェクトは残る（行き先 0 件のプロジェクトはポップアップに出ず、管理ページで消せる）
  - `moveEnvironment(projects, projectId, envId, toIndex: number): Project[]`
  - `reconcile(order: string[], projects: Project[]): Project[]` — 同期の食い違いを 1 つに寄せる
- Consumes: `defaultLabel`（Task 2）

- [ ] **Step 1: 失敗するテストを書く**

主なアサーション:
- `createProject` で作ったプロジェクトの `environments[0]` が `{ label: 'localhost:3000', origin: 'http://localhost:3000' }`（`id` は任意の文字列）
- 既にどこかに登録済みの `origin` を `createProject` / `addEnvironment` すると `{ ok: false, reason: 'origin-taken', projectName: <登録先の名前> }`
- `findProjectByOrigin` が一致するプロジェクトを返し、なければ `undefined`
- `moveEnvironment` / `moveProject` で並びが変わり、範囲外の `toIndex` は端に丸める
- `removeEnvironment` で最後の行き先を消すと `environments` が空のプロジェクトが残る
- `reconcile`:
  - 並び順に従って並べる
  - 並び順にないプロジェクトは末尾に足す（足す順は `id` の昇順で、結果が端末によらず同じになるようにする）
  - 存在しない `id` を指す並び順は無視する
  - 同じ `origin` が 2 つのプロジェクトにあるとき、並び順で先のプロジェクトに残し、後のプロジェクトからは外す
- どの関数も引数の配列を変更しない（`structuredClone` した入力と呼び出し後の入力が等しい）

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test -- tests/projects.test.ts`
Expected: FAIL

- [ ] **Step 3: `lib/projects.ts` を実装する**

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test -- tests/projects.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/projects.ts tests/projects.test.ts
git commit -m "プロジェクトと行き先を操作する処理を追加"
```

---

### Task 4: 保存と同期

**Files:**
- Create: `lib/storage.ts`、`lib/use-projects.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Consumes: `Project`、`OpResult`、`reconcile`（Task 3）
- Produces:
  - `loadProjects(): Promise<Project[]>` — `storage.sync` の全項目から `project:` で始まるものと `projectOrder` を読み、`reconcile` を通して返す
  - `updateProjects(op: (current: Project[]) => OpResult | Project[]): Promise<OpResult>` — 毎回 `loadProjects()` で最新を読んでから `op` を当て、差分だけを書く（変わったプロジェクトの `project:<id>` を `set`、消えたものを `remove`、並び順が変わったら `projectOrder` を `set`）。`op` が `Project[]` を返したら `{ ok: true, projects }` として扱う。`op` が `ok: false` を返したら何も書かずにそれを返す。書き込みに失敗したら例外をそのまま投げる
  - `watchProjects(onChange: (projects: Project[]) => void): () => void` — `storage.onChanged`（`areaName === 'sync'`）で `loadProjects()` を呼び直して通知する。戻り値で購読を解除する
  - `useProjects(): { projects: Project[] | null; error: string | null; update: (op) => Promise<OpResult | null> }`（`lib/use-projects.ts`）— 初回に読み込み、`watchProjects` で追従する。`update` が例外を受けたら `error` に `t('errorSaveFailed')` を入れて `null` を返し、`projects` は変えない

- [ ] **Step 1: 失敗するテストを書く（`fakeBrowser` を使い、`beforeEach` で `fakeBrowser.reset()`）**

主なアサーション:
- 何も保存されていなければ `loadProjects()` は `[]`
- `updateProjects` でプロジェクトを作ると、`storage.sync` に `project:<id>` と `projectOrder` が書かれる
- 1 つのプロジェクトの名前だけ変えたとき、ほかのプロジェクトのキーには `set` が呼ばれない（`vi.spyOn(fakeBrowser.storage.sync, 'set')` の引数で確認）
- プロジェクトを消すと `project:<id>` が `remove` され、`projectOrder` からも消える
- **古い状態からの上書き防止**: `storage.sync` を直接書き換えてプロジェクト B を足したあとに、手元にある古い配列を使わず `updateProjects(p => renameProject(p, A, 'x'))` を呼ぶと、B が残っている
- `op` が `ok: false` を返したら `set` も `remove` も呼ばれない
- **書き込み失敗**: `set` が reject すると `updateProjects` も reject し、`storage.sync` の中身は変わらない
- `watchProjects` のコールバックが、別の書き込みのあとに最新の配列で呼ばれ、解除後は呼ばれない

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test -- tests/storage.test.ts`
Expected: FAIL

- [ ] **Step 3: `lib/storage.ts` と `lib/use-projects.ts` を実装し、`errorSaveFailed` の文言を両言語に足す**

en: `Couldn't save. Please try again in a moment.` / ja: `保存できませんでした。少し待ってからもう一度お試しください。`

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts lib/use-projects.ts tests/storage.test.ts public/_locales
git commit -m "chrome.storage.sync への保存と同期の追従を追加"
```

---

### Task 5: ポップアップでの切り替え

**Files:**
- Modify: `entrypoints/popup/App.tsx`
- Create: `entrypoints/popup/SwitchList.tsx`、`entrypoints/popup/Header.tsx`、`entrypoints/popup/style.css`、`lib/tabs.ts`
- Test: `tests/popup-switch.test.tsx`

**Interfaces:**
- Consumes: `toOrigin`、`buildSwitchedUrl`（Task 2）、`findProjectByOrigin`（Task 3）、`useProjects`（Task 4）、`t`（Task 1）
- Produces:
  - `getActiveTab(): Promise<{ id: number; index: number; url: string } | null>`（`lib/tabs.ts`。`browser.tabs.query({ active: true, currentWindow: true })`）
  - `openInTab(tab: { id: number; index: number }, url: string, inNewTab: boolean): Promise<void>` — `inNewTab` が偽なら `tabs.update(tab.id, { url })` してポップアップを閉じる（`window.close()`）。真なら `tabs.create({ url, index: tab.index + 1, active: false })`（⌘クリックの慣習に合わせて背面で開く）
  - `Header({ title }: { title: string })` — タイトルと、右上の歯車ボタン（`browser.runtime.openOptionsPage()`、`aria-label` は `t('openSettings')`）。Task 6 でも使う
  - `App` の状態の分岐: タブの URL から `toOrigin` が `null` → 使えない旨の表示 / 一致するプロジェクトがあり行き先が 1 件以上 → `SwitchList` / それ以外 → 登録の表示（Task 6 で中身を作る。このタスクでは空でよい）

- [ ] **Step 1: 失敗するテストを書く（`getActiveTab` と `openInTab` は `vi.mock` で差し替え、storage は `fakeBrowser` に事前に書く）**

主なアサーション:
- 今の URL が `https://stg1.example.com/a?b=1` で、プロジェクト `my-service` に `https://example.com`・`https://stg1.example.com`・`http://localhost:3000` があるとき、3 つのラベルが登録順に並び、`stg1.example.com` の行が `aria-current="true"`
- `localhost:3000` の行をクリックすると `openInTab(tab, 'http://localhost:3000/a?b=1', false)`
- ⌘クリック（`metaKey`）、Ctrl クリック（`ctrlKey`）、中クリック（`button: 1`、`auxclick`）では第 3 引数が `true`
- 下キーで次の行にフォーカスが移り、Enter で `openInTab(..., false)`
- 今の URL が `chrome://extensions` / `about:blank` のとき `t('unsupportedPage')` の文言だけが出る
- 歯車ボタンを押すと `browser.runtime.openOptionsPage` が呼ばれる

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test -- tests/popup-switch.test.tsx`
Expected: FAIL

- [ ] **Step 3: 実装し、`unsupportedPage`・`openSettings` の文言を両言語に足す**

各行は「ラベル」と「ホスト（`defaultLabel(origin)`）」の 2 列。ポップアップの幅は `320px` 固定。ラベル・ホスト・プロジェクト名はそれぞれ `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0` にし、`title` 属性に全文を入れる。`useProjects` の `error` があれば一覧の上に出す。

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 実機で表示を確認する**

`npm run dev` で開いた Chrome で、ラベルに 60 文字の文字列、ホストに `very-long-subdomain-for-testing-overflow.staging.example.co.jp:8443` を登録した状態（ポップアップを右クリックして開いた DevTools のコンソールから `chrome.storage.sync.set` で書く）にして、はみ出さず「…」になり、ホバーで全文が出ることを目で確かめる。

- [ ] **Step 6: Commit**

```bash
git add entrypoints/popup lib/tabs.ts tests/popup-switch.test.tsx public/_locales
git commit -m "ポップアップから同じプロジェクトの別環境へ切り替えられるようにする"
```

---

### Task 6: ポップアップでの登録

**Files:**
- Modify: `entrypoints/popup/App.tsx`
- Create: `entrypoints/popup/RegisterPanel.tsx`
- Test: `tests/popup-register.test.tsx`

**Interfaces:**
- Consumes: `createProject`、`addEnvironment`（Task 3）、`useProjects`（Task 4）、`Header`（Task 5）、`defaultLabel`（Task 2）
- Produces: `RegisterPanel({ origin, projects, update }: { origin: string; projects: Project[]; update: ReturnType<typeof useProjects>['update'] })`

- [ ] **Step 1: 失敗するテストを書く**

主なアサーション:
- 今の URL が未登録の `https://stg3.example.com/x` のとき、見出しに `stg3.example.com`、「新しいプロジェクトを作る」と「既存に追加」の 2 つが出る
- 「新しいプロジェクトを作る」を押すと名前の入力欄が出て、初期値は `stg3.example.com`。確定すると `storage.sync` にそのプロジェクトができ、画面が `SwitchList` に変わって `stg3.example.com` が今の行き先として印付きで出る
- 名前が空白だけのときは確定できない
- 「既存に追加」は既存プロジェクトの選択（プロジェクトが 0 件なら出さない）。選んで追加すると、そのプロジェクトの末尾に入り、画面が `SwitchList` に変わる
- `update` が `{ ok: false, reason: 'origin-taken', projectName: 'my-service' }` を返したら `t('originTaken', 'my-service')` の文言が出る（別の端末で同時に登録された場合）
- 行き先が 0 件のプロジェクトに一致した場合も、未登録として登録の表示になる

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test -- tests/popup-register.test.tsx`
Expected: FAIL

- [ ] **Step 3: 実装し、`createProject`・`projectNameLabel`・`addToExisting`・`originTaken`（`$1` にプロジェクト名）の文言を両言語に足す**

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add entrypoints/popup tests/popup-register.test.tsx public/_locales
git commit -m "今のページからプロジェクトの作成と行き先の追加をできるようにする"
```

---

### Task 7: 管理ページ

**Files:**
- Modify: `entrypoints/options/App.tsx`
- Create: `entrypoints/options/ProjectCard.tsx`、`entrypoints/options/style.css`
- Test: `tests/options.test.tsx`

**Interfaces:**
- Consumes: `renameProject`、`removeProject`、`moveProject`、`renameEnvironment`、`removeEnvironment`、`moveEnvironment`（Task 3）、`useProjects`（Task 4）、`t`
- Produces: なし（最後の UI）

- [ ] **Step 1: 失敗するテストを書く**

主なアサーション:
- 全プロジェクトが並び順どおりに出る。0 件なら `t('noProjects')`（「ページを開いてツールバーのボタンから登録してください」に当たる文言）
- プロジェクト名と行き先のラベルを書き換えて確定（Enter またはフォーカスが外れたとき）すると `storage.sync` に反映される。空白だけなら元の値に戻す
- 行き先とプロジェクトを並べ替えると `storage.sync` に反映される（並べ替えの操作方法はドラッグでも上下ボタンでもよいが、キーボードだけでもできること）
- 行き先とプロジェクトを削除できる。削除の前に確認を挟む（`window.confirm` は使わず、画面内で確認する）
- 行き先の行には `origin` が全文で見える（`http://` と `https://` の区別がつく）
- 別の端末からの変更（`storage.sync` を直接書き換える）が画面に反映される
- `update` が失敗したとき `t('errorSaveFailed')` が出る
- 行き先の追加の操作はない

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test -- tests/options.test.tsx`
Expected: FAIL

- [ ] **Step 3: 実装し、使う文言を両言語に足す**

並べ替えをドラッグで作る場合も、書き込みはドロップした時点の 1 回だけにする（`storage.sync` の書き込み回数上限のため）。

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add entrypoints/options tests/options.test.tsx public/_locales
git commit -m "全プロジェクトを編集できる管理ページを追加"
```

---

### Task 8: ストア提出の準備

**Files:**
- Create: `public/icon/16.png`、`public/icon/32.png`、`public/icon/48.png`、`public/icon/128.png`（とその元にした SVG `assets/icon.svg`）
- Create: `docs/store/listing.en.md`、`docs/store/listing.ja.md`、`PRIVACY.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: 完成した拡張全体

- [ ] **Step 1: アイコンを作る**

オリジナルの図柄で SVG を描き、4 サイズの PNG に書き出す（WXT テンプレートの既定アイコンは使わない）。16px でも形が判別できること。

- [ ] **Step 2: 掲載文を書く**

英語・日本語それぞれに、短い説明（132 文字以内）、詳しい説明、各権限の理由（`activeTab`: ボタンを押したときだけ今のタブの URL を読むため / `storage`: 登録内容を保存し、自分の Chrome 同士で同期するため）、データの扱い（収集しない・外部へ送らない）を書く。

- [ ] **Step 3: `PRIVACY.md` を書く**

英語・日本語の両方で、読むデータ（ボタンを押したときの今のタブの URL）、保存するデータ（登録した origin・ラベル・プロジェクト名を `chrome.storage.sync` に保存し、Chrome の同期で利用者の Google アカウントに同期される）、送信しないこと、を書く。ストアに登録する URL は `https://github.com/shinespark/domain-hopper/blob/main/PRIVACY.md`。

- [ ] **Step 4: `README.md` を書き直す**

機能、使い方（登録・切り替え・管理ページ）、権限と外部通信をしないこと、開発方法（`npm install`、`npm run dev`、`npm test`、`npm run zip`）を書く。

- [ ] **Step 5: 提出用 zip を作って中身を確かめる**

Run: `npm test && npm run zip && unzip -l .output/*-chrome.zip && unzip -p .output/*-chrome.zip manifest.json | jq '{permissions, host_permissions, icons}'`
Expected: テストが PASS。zip に `_locales/en/messages.json`・`_locales/ja/messages.json`・4 サイズのアイコンが入っている。`permissions` が `["activeTab","storage"]`、`host_permissions` が `null`

- [ ] **Step 6: 外部通信がないことを確かめる**

Run: `unzip -o -q .output/*-chrome.zip -d .output/zip-check && grep -rEo 'https?://[^"'"'"' )]+' .output/zip-check | sort -u`
Expected: React などのライブラリに埋め込まれたドキュメントへのリンク以外に、通信先になる URL がない（`fetch` や `XMLHttpRequest` の呼び出しも `grep -rE 'fetch\(|XMLHttpRequest' .output/zip-check` で確認し、自分のコードからの呼び出しがないこと）

- [ ] **Step 7: Commit**

```bash
git add public/icon assets docs/store PRIVACY.md README.md
git commit -m "ストア提出用のアイコン・掲載文・プライバシーポリシーを追加"
```
