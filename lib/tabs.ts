export type ActiveTab = { id: number; index: number; url: string };

export async function getActiveTab(): Promise<ActiveTab | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id === undefined || !tab.url) return null;
  return { id: tab.id, index: tab.index, url: tab.url };
}

export async function openInTab(tab: { id: number; index: number }, url: string, inNewTab: boolean): Promise<void> {
  if (inNewTab) {
    await browser.tabs.create({ url, index: tab.index + 1, active: false });
    return;
  }
  await browser.tabs.update(tab.id, { url });
  window.close();
}
