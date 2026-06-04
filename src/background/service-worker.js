import browser from 'webextension-polyfill';
import { loadConfig, seedDefaults, CONFIG_KEY } from '../common/storage.js';
import { fieldsForCategory, scenarioFields } from '../common/schema.js';
import { parseMenuId, createMenuRebuilder } from './menus.js';

// Serialized so overlapping triggers (onInstalled + the seed-write's
// storage.onChanged, onStartup, config edits) never race into duplicate-id
// create() calls.
const buildMenus = createMenuRebuilder(browser.contextMenus, loadConfig);

async function flashBadge(text) {
  try {
    await browser.action.setBadgeText({ text });
    setTimeout(() => browser.action.setBadgeText({ text: '' }), 1500);
  } catch {
    /* action API unavailable; ignore */
  }
}

browser.runtime.onInstalled.addListener(async () => {
  await seedDefaults();
  try {
    await browser.action.setBadgeBackgroundColor({ color: '#2a8a3e' });
  } catch {
    /* action API unavailable; ignore */
  }
  await buildMenus();
});

if (browser.runtime.onStartup) {
  browser.runtime.onStartup.addListener(() => {
    buildMenus().catch(() => { /* menu rebuild failed; non-fatal */ });
  });
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[CONFIG_KEY]) {
    buildMenus().catch(() => { /* menu rebuild failed; non-fatal */ });
  }
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;
  const parsed = parseMenuId(String(info.menuItemId));
  if (!parsed) return;
  const { pkey, scenario, cat } = parsed;
  const config = await loadConfig();
  const provider = config.providers[pkey];
  if (!provider) return;
  const fields = fieldsForCategory(scenarioFields(provider, scenario), cat);
  try {
    const res = await browser.tabs.sendMessage(
      tab.id,
      { type: 'CHECKOUTFILLER_FILL', fields },
      { frameId: info.frameId },
    );
    await flashBadge(res && res.count ? String(res.count) : '0');
  } catch {
    await flashBadge('!');
  }
});
