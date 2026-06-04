import { describe, it, expect } from 'vitest';
import { menuItems, parseMenuId, createMenuRebuilder, FILL_PREFIX } from '../src/background/menus.js';

const oneProvider = { version: 1, providers: { p: { label: 'P', fields: {} } } };

describe('menuItems', () => {
  it('emits root + provider + one item per category', () => {
    const items = menuItems(oneProvider);
    // 1 root + 1 provider + 5 categories (card, identity, address, ssn, all)
    expect(items).toHaveLength(7);
    expect(items[0].id).toBe('checkoutfiller');
    expect(items.map((i) => i.id)).toContain('provider:p');
    expect(items.map((i) => i.id)).toEqual(
      expect.arrayContaining([
        'fill:p:card',
        'fill:p:identity',
        'fill:p:address',
        'fill:p:ssn',
        'fill:p:all',
      ]),
    );
  });
});

describe('parseMenuId', () => {
  it('parses provider keys that contain hyphens', () => {
    expect(parseMenuId('fill:klarna-kco:card')).toEqual({ pkey: 'klarna-kco', cat: 'card' });
  });

  it('parses provider keys that contain a colon (category from last colon)', () => {
    expect(parseMenuId('fill:my:provider:all')).toEqual({ pkey: 'my:provider', cat: 'all' });
  });

  it('returns null for non-fill ids', () => {
    expect(parseMenuId('provider:p')).toBeNull();
    expect(parseMenuId('checkoutfiller')).toBeNull();
  });
});

// Regression for: "Cannot create item with duplicate id" — two concurrent
// rebuilds raced because removeAll() yields before the create() loop.
describe('createMenuRebuilder concurrency', () => {
  function fakeMenus() {
    const live = new Set();
    return {
      live,
      async removeAll() {
        // async like the real API — yields the event loop
        await Promise.resolve();
        live.clear();
      },
      create(item) {
        if (live.has(item.id)) throw new Error(`Cannot create item with duplicate id ${item.id}`);
        live.add(item.id);
      },
    };
  }

  it('serializes concurrent rebuilds without duplicate-id errors', async () => {
    const menus = fakeMenus();
    const loadConfig = async () => oneProvider;
    const rebuild = createMenuRebuilder(menus, loadConfig);

    await Promise.all([rebuild(), rebuild(), rebuild()]);

    expect(menus.live.has('checkoutfiller')).toBe(true);
    expect(menus.live.size).toBe(7);
  });
});
