import { CATEGORIES, CATEGORY_LABELS } from '../common/schema.js';

export const FILL_PREFIX = 'fill:';
const CONTEXTS = ['editable', 'page'];

// Build the full list of context-menu item descriptors for a config.
// Pure — performs no browser calls.
export function menuItems(config) {
  const items = [{ id: 'checkoutfiller', title: 'CheckoutFiller', contexts: CONTEXTS }];
  for (const [pkey, provider] of Object.entries(config.providers)) {
    const pid = `provider:${pkey}`;
    items.push({ id: pid, parentId: 'checkoutfiller', title: provider.label, contexts: CONTEXTS });
    for (const cat of Object.keys(CATEGORIES)) {
      items.push({
        id: `${FILL_PREFIX}${pkey}:${cat}`,
        parentId: pid,
        title: CATEGORY_LABELS[cat],
        contexts: CONTEXTS,
      });
    }
  }
  return items;
}

// Menu ID = `fill:<providerKey>:<category>`. The category is always one of the
// CATEGORIES keys (colon-free); provider keys are user-editable JSON and could
// contain a colon, so take the category from the last colon and treat everything
// before it as the key.
export function parseMenuId(id) {
  if (!id.startsWith(FILL_PREFIX)) return null;
  const body = id.slice(FILL_PREFIX.length);
  const lastColon = body.lastIndexOf(':');
  if (lastColon === -1) return null;
  return { pkey: body.slice(0, lastColon), cat: body.slice(lastColon + 1) };
}

async function doRebuild(menus, loadConfig) {
  await menus.removeAll();
  const config = await loadConfig();
  for (const item of menuItems(config)) menus.create(item);
}

// Returns a rebuild function. Concurrent calls run sequentially so a
// removeAll→create sequence can never interleave with another (which would
// produce "duplicate id" errors from contextMenus.create). Each call chains
// onto the previous one; the internal queue swallows errors so one failed
// rebuild neither poisons later rebuilds nor surfaces as an unhandled rejection.
export function createMenuRebuilder(menus, loadConfig) {
  let queue = Promise.resolve();
  return function rebuild() {
    const next = queue.then(() => doRebuild(menus, loadConfig));
    queue = next.catch(() => {});
    return next;
  };
}
