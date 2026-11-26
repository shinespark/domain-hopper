# Chrome Web Store listing (English)

## Short description

Switch the current page to another environment, keeping the same path.

## Detailed description

Domain Hopper switches the tab you are on to another environment of the same site (production, staging, local) and keeps the path, query and hash.

- Register the current page as a project, or add it to an existing project as another environment.
- Click an environment to switch the current tab to it.
- Cmd/Ctrl-click or middle-click to open it in a background tab next to the current one.
- Add projects and environments, change their scheme and host, and rename, reorder or delete projects and environments from the settings page.
- Works with http and https pages, including localhost and ports.

Domain Hopper makes no network requests and has no analytics. Your projects are stored with chrome.storage.sync: if you have turned on Chrome sync they follow you across your own Chrome browsers, otherwise they stay on this device only.

## Permission justification

- activeTab: Reads the URL of the current tab only when you press the toolbar button, to work out which site you are on and where to go next.
- storage: Saves the projects and environments you register, and, if you have turned on Chrome sync, syncs them between your own Chrome browsers.

## Data handling

- Collects no personal data and sends nothing to any server, including the developer.
- The only data read is the URL of the current tab, at the moment you press the button.
- Registered origins, labels and project names are stored in chrome.storage.sync. Only if you have turned on Chrome sync, Chrome syncs them through your Google account; otherwise they stay on this device only.
- Privacy policy: https://shinespark.github.io/domain-hopper/privacy-policy/en/
