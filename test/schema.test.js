import { describe, it, expect } from 'vitest';
import {
  CONFIG_VERSION,
  LOGICAL_KEYS,
  CATEGORIES,
  CATEGORY_LABELS,
  keysForCategory,
  fieldsForCategory,
  validateConfig,
  scenarioFields,
  migrateConfig,
  autoRefillEnabled,
} from '../src/common/schema.js';

describe('categories', () => {
  it('groups logical keys per category', () => {
    expect(keysForCategory('card')).toEqual(['cardNumber', 'cardExp', 'cardCvc', 'cardName']);
    expect(keysForCategory('identity')).toContain('email');
    expect(keysForCategory('address')).toContain('postalCode');
  });

  it('"all" is the union of every category', () => {
    expect(keysForCategory('all').sort()).toEqual([...LOGICAL_KEYS].sort());
  });

  it('"all" has no duplicate keys', () => {
    const all = keysForCategory('all');
    expect(new Set(all).size).toBe(all.length);
  });

  it('labels every category including all', () => {
    for (const cat of ['card', 'identity', 'address', 'ssn', 'bank', 'all']) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });

  it('has a dedicated personal-number (ssn) category', () => {
    expect(keysForCategory('ssn')).toEqual(['ssn']);
    expect(CATEGORY_LABELS.ssn).toBe('Personal number');
  });

  it('has a bank/account category with the six bank keys', () => {
    expect(keysForCategory('bank')).toEqual([
      'bankClearing', 'bankAccount', 'iban', 'bic', 'bankgiro', 'plusgiro',
    ]);
    expect(CATEGORY_LABELS.bank).toBe('Bank / account');
  });

  it('includes bank keys in "all"', () => {
    for (const k of ['bankClearing', 'bankAccount', 'iban', 'bic', 'bankgiro', 'plusgiro']) {
      expect(keysForCategory('all')).toContain(k);
    }
  });
});

describe('fieldsForCategory', () => {
  it('returns only present, non-empty keys for the category', () => {
    const fields = { cardNumber: '4242', cardCvc: '', email: 'a@b.c' };
    expect(fieldsForCategory(fields, 'card')).toEqual({ cardNumber: '4242' });
    expect(fieldsForCategory(fields, 'identity')).toEqual({ email: 'a@b.c' });
  });
});

describe('validateConfig', () => {
  const good = { version: CONFIG_VERSION, providers: { p: { label: 'P', fields: { email: 'a@b.c' } } } };

  it('accepts a well-formed config', () => {
    expect(validateConfig(good)).toEqual({ valid: true, errors: [] });
  });

  it('rejects wrong version', () => {
    const bad = { ...good, version: 99 };
    expect(validateConfig(bad).valid).toBe(false);
  });

  it('rejects unknown field keys', () => {
    const bad = { version: CONFIG_VERSION, providers: { p: { label: 'P', fields: { nope: 'x' } } } };
    const res = validateConfig(bad);
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/unknown field/);
  });

  it('rejects a provider missing a label', () => {
    const bad = { version: CONFIG_VERSION, providers: { p: { fields: {} } } };
    expect(validateConfig(bad).valid).toBe(false);
  });

  it('accepts a provider with valid scenarios', () => {
    const cfg = {
      version: CONFIG_VERSION,
      providers: {
        p: {
          label: 'P',
          fields: { email: 'a@b.c' },
          scenarios: [{ label: 'Denied', fields: { ssn: 'x', iban: 'y' } }],
        },
      },
    };
    expect(validateConfig(cfg)).toEqual({ valid: true, errors: [] });
  });

  it('rejects scenarios that are not an array', () => {
    const cfg = { version: CONFIG_VERSION, providers: { p: { label: 'P', fields: {}, scenarios: {} } } };
    expect(validateConfig(cfg).valid).toBe(false);
  });

  it('rejects a scenario missing a label or with an unknown field', () => {
    const noLabel = { version: CONFIG_VERSION, providers: { p: { label: 'P', fields: {}, scenarios: [{ fields: {} }] } } };
    expect(validateConfig(noLabel).valid).toBe(false);
    const badKey = { version: CONFIG_VERSION, providers: { p: { label: 'P', fields: {}, scenarios: [{ label: 'S', fields: { nope: 'x' } }] } } };
    const res = validateConfig(badKey);
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/unknown field/);
  });

  it('accepts an optional settings object', () => {
    const cfg = { version: CONFIG_VERSION, settings: { autoRefill: true }, providers: { p: { label: 'P', fields: {} } } };
    expect(validateConfig(cfg)).toEqual({ valid: true, errors: [] });
  });

  it('rejects a non-boolean settings.autoRefill', () => {
    const cfg = { version: CONFIG_VERSION, settings: { autoRefill: 'yes' }, providers: { p: { label: 'P', fields: {} } } };
    expect(validateConfig(cfg).valid).toBe(false);
  });

  it('rejects a non-object settings', () => {
    const cfg = { version: CONFIG_VERSION, settings: 'x', providers: { p: { label: 'P', fields: {} } } };
    expect(validateConfig(cfg).valid).toBe(false);
  });
});

describe('autoRefillEnabled', () => {
  it('defaults to false when settings or the key is absent', () => {
    expect(autoRefillEnabled({ version: CONFIG_VERSION, providers: {} })).toBe(false);
    expect(autoRefillEnabled({ settings: {}, providers: {} })).toBe(false);
    expect(autoRefillEnabled(null)).toBe(false);
  });

  it('is true only when settings.autoRefill is true', () => {
    expect(autoRefillEnabled({ settings: { autoRefill: true }, providers: {} })).toBe(true);
    expect(autoRefillEnabled({ settings: { autoRefill: false }, providers: {} })).toBe(false);
  });
});

describe('scenarioFields', () => {
  const provider = {
    label: 'P',
    fields: { email: 'a@b.c', ssn: 'base-ssn' },
    scenarios: [
      { label: 'Denied', fields: { ssn: 'denied-ssn' } },
      { label: 'Swish', fields: { phone: '0700000000' } },
    ],
  };

  it('returns the base fields when no scenario is selected', () => {
    expect(scenarioFields(provider, null)).toEqual({ email: 'a@b.c', ssn: 'base-ssn' });
  });

  it('merges a scenario override onto the base', () => {
    expect(scenarioFields(provider, 0)).toEqual({ email: 'a@b.c', ssn: 'denied-ssn' });
    expect(scenarioFields(provider, 1)).toEqual({ email: 'a@b.c', ssn: 'base-ssn', phone: '0700000000' });
  });

  it('falls back to base for an out-of-range or scenario-less provider', () => {
    expect(scenarioFields(provider, 5)).toEqual(provider.fields);
    expect(scenarioFields({ label: 'X', fields: { email: 'x@y.z' } }, 0)).toEqual({ email: 'x@y.z' });
    expect(scenarioFields({ label: 'X' }, null)).toEqual({});
  });
});

describe('migrateConfig', () => {
  it('renames the legacy klarna-kco key to kustom-kco and updates the default label', () => {
    const v1 = {
      version: 1,
      providers: {
        generic: { label: 'Generic test card', fields: { email: 'g@x.c' } },
        'klarna-kco': { label: 'Klarna (KCO)', fields: { ssn: '123' } },
      },
    };
    const out = migrateConfig(v1);
    expect(out.version).toBe(CONFIG_VERSION);
    expect(out.providers['klarna-kco']).toBeUndefined();
    expect(out.providers['kustom-kco']).toEqual({ label: 'Kustom (KCO)', fields: { ssn: '123' } });
    expect(Object.keys(out.providers)).toEqual(['generic', 'kustom-kco']);
  });

  it('preserves a user-customised label and field edits during rename', () => {
    const v1 = {
      version: 1,
      providers: { 'klarna-kco': { label: 'My Klarna', fields: { ssn: 'edited' } } },
    };
    const out = migrateConfig(v1);
    expect(out.providers['kustom-kco']).toEqual({ label: 'My Klarna', fields: { ssn: 'edited' } });
  });

  it('is idempotent and a no-op when kustom-kco already exists', () => {
    const v2 = { version: CONFIG_VERSION, providers: { 'kustom-kco': { label: 'Kustom (KCO)', fields: {} } } };
    expect(migrateConfig(v2)).toEqual(v2);
    expect(migrateConfig(migrateConfig(v2))).toEqual(v2);
  });
});
