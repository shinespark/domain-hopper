# Chrome Web Store listing (English)

## Short description

Switch the current page to another environment, keeping the same path.

## Detailed description

domain-hopper switches the tab you are on to another environment of the same site (production, staging, local) and keeps the path, query and hash.

- Register the current page as a project, or add it to an existing project as another environment.
- Click an environment to switch the current tab to it.
- Cmd/Ctrl-click or middle-click to open it in a background tab next to the current one.
- Rename, reorder and delete projects and environments from the settings page.
- Works with http and https pages, including localhost and ports.

domain-hopper makes no network requests and has no analytics. Your projects are stored with Chrome sync, so they follow you across your own Chrome browsers.

## Permission justification

- activeTab: Reads the URL of the current tab only when you press the toolbar button, to work out which site you are on and where to go next.
- storage: Saves the projects and environments you register, and syncs them between your own Chrome browsers.

## Data handling

- Collects no personal data and sends nothing to any server, including the developer.
- The only data read is the URL of the current tab, at the moment you press the button.
- Registered origins, labels and project names are stored in chrome.storage.sync and synced through your Google account by Chrome.
- Privacy policy: https://github.com/shinespark/domain-hopper/blob/main/PRIVACY.md
