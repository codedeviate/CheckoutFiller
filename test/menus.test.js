import { describe, it, expect } from 'vitest';
import { menuItems, parseMenuId, createMenuRebuilder } from '../src/background/menus.js';

const flatProvider = { version: 2, providers: { p: { label: 'P', fields: {} } } };
const scenarioProvider = {
  version: 2,
  providers: {
    s: {
      label: 'S',
      fields: {},
      scenarios: [{ label: 'Accepted', fields: {} }, { label: 'Declined', fields: {} }],
    },
  },
};

describe('menuItems', () => {
  it('emits root + provider + one item per category for a flat provider', () => {
    const items = menuItems(flatProvider);
    // 1 root + 1 provider + 6 categories (card, identity, address, ssn, bank, all)
    expect(items).toHaveLength(8);
    expect(items[0].id).toBe('checkoutfiller');
    expect(items.map((i) => i.id)).toEqual(
      expect.arrayContaining(['fill:p:-:card', 'fill:p:-:bank', 'fill:p:-:all']),
    );
  });

  it('emits a scenario level (provider + N scenarios + N*categories) for a scenario provider', () => {
    const items = menuItems(scenarioProvider);
    // 1 root + 1 provider + 2 scenarios + 2*6 category leaves
    expect(items).toHaveLength(1 + 1 + 2 + 12);
    expect(items.map((i) => i.id)).toEqual(
      expect.arrayContaining(['scenario:s:0', 'scenario:s:1', 'fill:s:0:card', 'fill:s:1:all']),
    );
  });
});

describe('parseMenuId', () => {
  it('parses a scenario-less id (token "-") to scenario null', () => {
    expect(parseMenuId('fill:p:-:card')).toEqual({ pkey: 'p', scenario: null, cat: 'card' });
  });

  it('parses a scenario id to an integer index', () => {
    expect(parseMenuId('fill:p:2:all')).toEqual({ pkey: 'p', scenario: 2, cat: 'all' });
  });

  it('handles provider keys containing a colon', () => {
    expect(parseMenuId('fill:my:provider:-:bank')).toEqual({ pkey: 'my:provider', scenario: null, cat: 'bank' });
  });

  it('returns null for non-fill or malformed ids', () => {
    expect(parseMenuId('provider:p')).toBeNull();
    expect(parseMenuId('checkoutfiller')).toBeNull();
    expect(parseMenuId('fill:p:card')).toBeNull(); // missing scenario token
  });
});

describe('createMenuRebuilder concurrency', () => {
  function fakeMenus() {
    const live = new Set();
    return {
      live,
      async removeAll() { await Promise.resolve(); live.clear(); },
      create(item) {
        if (live.has(item.id)) throw new Error(`Cannot create item with duplicate id ${item.id}`);
        live.add(item.id);
      },
    };
  }

  it('serializes concurrent rebuilds without duplicate-id errors', async () => {
    const menus = fakeMenus();
    const rebuild = createMenuRebuilder(menus, async () => flatProvider);
    await Promise.all([rebuild(), rebuild(), rebuild()]);
    expect(menus.live.has('checkoutfiller')).toBe(true);
    expect(menus.live.size).toBe(8);
  });
});
