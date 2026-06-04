const AUTOCOMPLETE_MAP = {
  'email': 'email',
  'tel': 'phone',
  'tel-national': 'phone',
  'given-name': 'firstName',
  'family-name': 'lastName',
  'street-address': 'address1',
  'address-line1': 'address1',
  'postal-code': 'postalCode',
  'address-level2': 'city',
  'country': 'country',
  'country-name': 'country',
  'cc-number': 'cardNumber',
  'cc-exp': 'cardExp',
  'cc-csc': 'cardCvc',
  'cc-name': 'cardName',
};

// Order matters: more specific patterns first so "email address" hits email, not address.
const NAME_PATTERNS = [
  ['cardNumber', /card.?number|cardnum|\bpan\b|ccnumber|credit.?card/i],
  ['cardExp', /exp(iry|iration)?|cc.?exp|valid.?thru/i],
  ['cardCvc', /cvc|cvv|csc|security.?code|card.?code/i],
  ['cardName', /card.?holder|name.?on.?card|cc.?name/i],
  ['email', /e.?mail/i],
  ['ssn', /\bssn\b|personnummer|person.?id|national.?id|\bpnr\b|social.?security/i],
  ['phone', /phone|mobile|\btel\b|telephone/i],
  ['firstName', /first.?name|given.?name|\bfname\b|forename/i],
  ['lastName', /last.?name|family.?name|surname|\blname\b/i],
  ['postalCode', /post(al)?.?code|zip.?code|\bzip\b/i],
  ['city', /\bcity\b|\btown\b|\bort\b/i],
  ['address1', /address|street|\baddr\b|adress/i],
  ['country', /country|\bland\b/i],
];

function isFillable(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toUpperCase();
  if (tag === 'SELECT' || tag === 'TEXTAREA') return !el.disabled;
  if (tag !== 'INPUT') return false;
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  const skip = ['hidden', 'submit', 'button', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color', 'password'];
  if (skip.includes(type)) return false;
  if (el.disabled || el.readOnly) return false;
  return true;
}

function labelText(el) {
  let txt = '';
  if (el.id) {
    const safe = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(el.id) : el.id;
    const lbl = el.ownerDocument.querySelector(`label[for="${safe}"]`);
    if (lbl) txt += ' ' + lbl.textContent;
  }
  const wrap = el.closest && el.closest('label');
  if (wrap) txt += ' ' + wrap.textContent;
  const aria = el.getAttribute('aria-label');
  if (aria) txt += ' ' + aria;
  return txt;
}

export function detectLogicalKey(el) {
  if (!isFillable(el)) return null;

  const ac = (el.getAttribute('autocomplete') || '').trim().toLowerCase();
  if (ac) {
    const token = ac.split(/\s+/).pop();
    if (AUTOCOMPLETE_MAP[token]) return AUTOCOMPLETE_MAP[token];
  }

  const haystack = [
    el.getAttribute('name'),
    el.getAttribute('id'),
    el.getAttribute('placeholder'),
    labelText(el),
  ].filter(Boolean).join(' ');

  for (const [key, re] of NAME_PATTERNS) {
    if (re.test(haystack)) return key;
  }

  const type = (el.getAttribute('type') || '').toLowerCase();
  if (type === 'email') return 'email';
  if (type === 'tel') return 'phone';

  return null;
}
