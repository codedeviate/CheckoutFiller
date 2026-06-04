import { CATEGORIES, CATEGORY_LABELS } from '../common/schema.js';

export const FILL_PREFIX = 'fill:';
const CONTEXTS = ['editable', 'page'];

// Build the full list of context-menu item descriptors for a config.
// Pure — performs no browser calls. Leaf fill ids are
// `fill:<pkey>:<scenarioToken>:<cat>` where scenarioToken is the scenario index
// or `-` when the provider has no scenarios.
export function menuItems(config) {
  const items = [{ id: 'checkoutfiller', title: 'CheckoutFiller', contexts: CONTEXTS }];
  for (const [pkey, provider] of Object.entries(config.providers)) {
    const pid = `provider:${pkey}`;
    items.push({ id: pid, parentId: 'checkoutfiller', title: provider.label, contexts: CONTEXTS });
    const scenarios = Array.isArray(provider.scenarios) && provider.scenarios.length
      ? provider.scenarios
      : null;
    if (scenarios) {
      scenarios.forEach((sc, i) => {
        const sid = `scenario:${pkey}:${i}`;
        items.push({ id: sid, parentId: pid, title: sc.label, contexts: CONTEXTS });
        for (const cat of Object.keys(CATEGORIES)) {
          items.push({ id: `${FILL_PREFIX}${pkey}:${i}:${cat}`, parentId: sid, title: CATEGORY_LABELS[cat], contexts: CONTEXTS });
        }
      });
    } else {
      for (const cat of Object.keys(CATEGORIES)) {
        items.push({ id: `${FILL_PREFIX}${pkey}:-:${cat}`, parentId: pid, title: CATEGORY_LABELS[cat], contexts: CONTEXTS });
      }
    }
  }
  return items;
}

// Menu ID = `fill:<providerKey>:<scenarioToken>:<category>`. Category is the last
// colon-segment and scenarioToken the next; everything before them (which may
// itself contain colons) is the provider key. scenarioToken `-` → scenario null,
// otherwise an integer index.
export function parseMenuId(id) {
  if (!id.startsWith(FILL_PREFIX)) return null;
  const parts = id.slice(FILL_PREFIX.length).split(':');
  if (parts.length < 3) return null;
  const cat = parts.pop();
  const scenarioToken = parts.pop();
  const pkey = parts.join(':');
  if (!pkey || !cat) return null;
  let scenario = null;
  if (scenarioToken !== '-') {
    scenario = Number(scenarioToken);
    if (!Number.isInteger(scenario) || scenario < 0) return null;
  }
  return { pkey, scenario, cat };
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
