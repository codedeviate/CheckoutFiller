import { detectLogicalKey } from './matchers.js';

export function findFormScope(el, doc) {
  const d = doc || (el && el.ownerDocument) || document;
  if (el && el.closest) {
    const form = el.closest('form');
    if (form) return { scope: form, scoped: true };
  }
  return { scope: d, scoped: false };
}

export function setNativeValue(el, value) {
  // Walk the prototype chain to the native `value` setter. React stashes the
  // previous value in a closure on that setter, so a plain `el.value =` would
  // be swallowed as a no-op. Custom elements can add chain levels, so we don't
  // assume the setter lives on the immediate prototype.
  let proto = Object.getPrototypeOf(el);
  while (proto && proto !== Object.prototype) {
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) {
      desc.set.call(el, value);
      return;
    }
    proto = Object.getPrototypeOf(proto);
  }
  el.value = value;
}

function fireEvents(el) {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

export function fillElement(el, value) {
  if (el.tagName && el.tagName.toUpperCase() === 'SELECT') {
    const want = String(value).toLowerCase();
    let match = [...el.options].find(
      (o) => o.value.toLowerCase() === want || o.text.toLowerCase() === want,
    );
    if (!match) {
      match = [...el.options].find(
        (o) => o.value.toLowerCase().includes(want) || o.text.toLowerCase().includes(want),
      );
    }
    if (!match) return false;
    setNativeValue(el, match.value);
  } else {
    setNativeValue(el, value);
  }
  fireEvents(el);
  return true;
}

export function fillScope(scope, fields) {
  const inputs = scope.querySelectorAll('input, select, textarea');
  let filled = 0;
  for (const el of inputs) {
    const key = detectLogicalKey(el);
    if (!key || !(key in fields)) continue;
    if (el.value && String(el.value).trim() !== '') continue;
    if (fillElement(el, fields[key])) filled++;
  }
  return filled;
}
