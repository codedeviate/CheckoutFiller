import browser from 'webextension-polyfill';
import { loadConfig, seedDefaults, CONFIG_KEY } from '../common/storage.js';
import { CATEGORY_LABELS, fieldsForCategory } from '../common/schema.js';

const CATS = ['card', 'identity', 'address', 'all'];
const CONTEXTS = ['editable', 'page'];

async function buildMenus() {
  await browser.contextMenus.removeAll();
  const config = await loadConfig();

  browser.contextMenus.create({ id: 'checkoutfiller', title: 'CheckoutFiller', contexts: CONTEXTS });

  for (const [pkey, provider] of Object.entries(config.providers)) {
    const pid = `provider:${pkey}`;
    browser.contextMenus.create({ id: pid, parentId: 'checkoutfiller', title: provider.label, contexts: CONTEXTS });
    for (const cat of CATS) {
      browser.contextMenus.create({
        id: `fill:${pkey}:${cat}`,
        parentId: pid,
        title: CATEGORY_LABELS[cat],
        contexts: CONTEXTS,
      });
    }
  }
}

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
  await buildMenus();
});

if (browser.runtime.onStartup) {
  browser.runtime.onStartup.addListener(buildMenus);
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[CONFIG_KEY]) buildMenus();
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = String(info.menuItemId);
  if (!id.startsWith('fill:') || !tab) return;
  const [, pkey, cat] = id.split(':');
  const config = await loadConfig();
  const provider = config.providers[pkey];
  if (!provider) return;
  const fields = fieldsForCategory(provider.fields, cat);
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
