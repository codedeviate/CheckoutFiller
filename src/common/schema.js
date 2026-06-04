export const CONFIG_VERSION = 2;

export const LOGICAL_KEYS = [
  'email', 'phone', 'firstName', 'lastName', 'ssn', 'companyName',
  'address1', 'postalCode', 'city', 'country',
  'cardNumber', 'cardExp', 'cardCvc', 'cardName',
  'bankClearing', 'bankAccount', 'iban', 'bic', 'bankgiro', 'plusgiro',
];

const CARD_KEYS = ['cardNumber', 'cardExp', 'cardCvc', 'cardName'];
const IDENTITY_KEYS = ['email', 'phone', 'firstName', 'lastName', 'ssn', 'companyName'];
const ADDRESS_KEYS = ['address1', 'postalCode', 'city', 'country'];
const BANK_KEYS = ['bankClearing', 'bankAccount', 'iban', 'bic', 'bankgiro', 'plusgiro'];

// Object key order defines the context-menu order. `ssn` is a dedicated
// quick-fill that overlaps `identity` (which also includes ssn) — intentional.
// `all` is the full union and stays last.
export const CATEGORIES = {
  card: CARD_KEYS,
  identity: IDENTITY_KEYS,
  address: ADDRESS_KEYS,
  ssn: ['ssn'],
  bank: BANK_KEYS,
  all: [...IDENTITY_KEYS, ...ADDRESS_KEYS, ...CARD_KEYS, ...BANK_KEYS],
};

export const CATEGORY_LABELS = {
  card: 'Card / payment',
  identity: 'Customer identity',
  address: 'Address',
  ssn: 'Personal number',
  bank: 'Bank / account',
  all: 'Fill everything',
};

export function keysForCategory(cat) {
  return CATEGORIES[cat] || [];
}

export function fieldsForCategory(providerFields, cat) {
  const result = {};
  for (const k of keysForCategory(cat)) {
    const v = providerFields ? providerFields[k] : undefined;
    if (v != null && v !== '') result[k] = v;
  }
  return result;
}

export function autoRefillEnabled(config) {
  return Boolean(config && config.settings && config.settings.autoRefill);
}

// Merge a provider's base fields with the override of the scenario at
// `scenarioIndex` (an integer, or null/undefined for "no scenario"). Falls back
// to the base when the index is missing, out of range, or the provider has no
// scenarios.
export function scenarioFields(provider, scenarioIndex) {
  const base = (provider && provider.fields) || {};
  if (scenarioIndex == null || !Array.isArray(provider?.scenarios)) return base;
  const sc = provider.scenarios[scenarioIndex];
  if (!sc || !sc.fields) return base;
  return { ...base, ...sc.fields };
}

export function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['config must be an object'] };
  }
  if (config.version !== CONFIG_VERSION) {
    errors.push(`version must be ${CONFIG_VERSION}`);
  }
  if (!config.providers || typeof config.providers !== 'object') {
    errors.push('providers must be an object');
    return { valid: false, errors };
  }
  for (const [key, p] of Object.entries(config.providers)) {
    if (!p || typeof p !== 'object') { errors.push(`provider ${key} must be an object`); continue; }
    if (!p.label) errors.push(`provider ${key} missing label`);
    if (!p.fields || typeof p.fields !== 'object') {
      errors.push(`provider ${key} missing fields`);
      continue;
    }
    for (const fk of Object.keys(p.fields)) {
      if (!LOGICAL_KEYS.includes(fk)) errors.push(`provider ${key} has unknown field "${fk}"`);
    }
    if (p.scenarios !== undefined) {
      if (!Array.isArray(p.scenarios)) {
        errors.push(`provider ${key} scenarios must be an array`);
      } else {
        p.scenarios.forEach((sc, i) => {
          if (!sc || typeof sc !== 'object') { errors.push(`provider ${key} scenario ${i} must be an object`); return; }
          if (!sc.label) errors.push(`provider ${key} scenario ${i} missing label`);
          if (!sc.fields || typeof sc.fields !== 'object') {
            errors.push(`provider ${key} scenario ${i} missing fields`);
            return;
          }
          for (const fk of Object.keys(sc.fields)) {
            if (!LOGICAL_KEYS.includes(fk)) errors.push(`provider ${key} scenario ${i} has unknown field "${fk}"`);
          }
        });
      }
    }
  }
  if (config.settings !== undefined) {
    if (typeof config.settings !== 'object' || config.settings === null || Array.isArray(config.settings)) {
      errors.push('settings must be an object');
    } else if (config.settings.autoRefill !== undefined && typeof config.settings.autoRefill !== 'boolean') {
      errors.push('settings.autoRefill must be a boolean');
    }
  }
  return { valid: errors.length === 0, errors };
}

// Upgrade a stored config to the current CONFIG_VERSION. v1→v2 renames the
// shipped provider key `klarna-kco` to `kustom-kco` in place (preserving menu
// order and any user edits); the default label is updated, a custom label is
// kept. Returns a new object; the input is not mutated. Nested `fields`/`scenarios`
// are shared references — fine for the load→migrate→read/save usage; deep-clone if
// you later mutate them in place.
export function migrateConfig(config) {
  if (!config || typeof config !== 'object' || !config.providers) return config;
  let providers = config.providers;
  if (providers['klarna-kco'] && !providers['kustom-kco']) {
    const renamed = {};
    for (const [key, p] of Object.entries(providers)) {
      if (key === 'klarna-kco') {
        const provider = { ...p };
        if (provider.label === 'Klarna (KCO)') provider.label = 'Kustom (KCO)';
        renamed['kustom-kco'] = provider;
      } else {
        renamed[key] = p;
      }
    }
    providers = renamed;
  }
  if (providers === config.providers && config.version === CONFIG_VERSION) return config;
  return { ...config, version: CONFIG_VERSION, providers };
}
