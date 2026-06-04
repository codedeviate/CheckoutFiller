import browser from 'webextension-polyfill';
import { loadConfig, seedDefaults, CONFIG_KEY } from '../common/storage.js';
import { CATEGORIES, CATEGORY_LABELS, fieldsForCategory } from '../common/schema.js';

const CATS = Object.keys(CATEGORIES);
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

// Menu ID = `fill:<providerKey>:<category>`. The category is always one of CATS
// (colon-free); provider keys are user-editable JSON and could contain a colon, so
// take the category from the last colon and treat everything before it as the key.
function parseMenuId(id) {
  const body = id.slice('fill:'.length);
  const lastColon = body.lastIndexOf(':');
  if (lastColon === -1) return null;
  return { pkey: body.slice(0, lastColon), cat: body.slice(lastColon + 1) };
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
  browser.runtime.onStartup.addListener(buildMenus);
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[CONFIG_KEY]) {
    buildMenus().catch(() => { /* menu rebuild failed; non-fatal */ });
  }
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = String(info.menuItemId);
  if (!id.startsWith('fill:') || !tab) return;
  const parsed = parseMenuId(id);
  if (!parsed) return;
  const { pkey, cat } = parsed;
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
