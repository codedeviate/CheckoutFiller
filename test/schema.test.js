import { describe, it, expect } from 'vitest';
import {
  CONFIG_VERSION,
  LOGICAL_KEYS,
  CATEGORIES,
  CATEGORY_LABELS,
  keysForCategory,
  fieldsForCategory,
  validateConfig,
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
});
