export const CONFIG_VERSION = 1;

export const LOGICAL_KEYS = [
  'email', 'phone', 'firstName', 'lastName', 'ssn',
  'address1', 'postalCode', 'city', 'country',
  'cardNumber', 'cardExp', 'cardCvc', 'cardName',
];

export const CATEGORIES = {
  card: ['cardNumber', 'cardExp', 'cardCvc', 'cardName'],
  identity: ['email', 'phone', 'firstName', 'lastName', 'ssn'],
  address: ['address1', 'postalCode', 'city', 'country'],
};
CATEGORIES.all = [...CATEGORIES.identity, ...CATEGORIES.address, ...CATEGORIES.card];

export const CATEGORY_LABELS = {
  card: 'Card / payment',
  identity: 'Customer identity',
  address: 'Address',
  all: 'Fill everything',
};

export function keysForCategory(cat) {
  return CATEGORIES[cat] || [];
}

export function fieldsForCategory(providerFields, cat) {
  const out = {};
  for (const k of keysForCategory(cat)) {
    const v = providerFields ? providerFields[k] : undefined;
    if (v != null && v !== '') out[k] = v;
  }
  return out;
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
  }
  return { valid: errors.length === 0, errors };
}
