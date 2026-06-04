import { describe, it, expect, beforeEach } from 'vitest';
import { setNativeValue, fillElement, findFormScope, fillScope } from '../src/content/filler.js';

beforeEach(() => { document.body.innerHTML = ''; });

describe('fillElement', () => {
  it('sets the value and fires input, change, blur', () => {
    document.body.innerHTML = '<input id="e">';
    const el = document.getElementById('e');
    const fired = [];
    for (const t of ['input', 'change', 'blur']) el.addEventListener(t, () => fired.push(t));
    const ok = fillElement(el, 'hello');
    expect(ok).toBe(true);
    expect(el.value).toBe('hello');
    expect(fired).toEqual(['input', 'change', 'blur']);
  });

  it('selects a <select> option by value or text', () => {
    document.body.innerHTML = '<select id="c"><option value="SE">Sweden</option><option value="NO">Norway</option></select>';
    const el = document.getElementById('c');
    expect(fillElement(el, 'SE')).toBe(true);
    expect(el.value).toBe('SE');
    expect(fillElement(el, 'Norway')).toBe(true);
    expect(el.value).toBe('NO');
  });

  it('matches a select option via substring fallback', () => {
    document.body.innerHTML = '<select id="c"><option value="SE">Sweden</option><option value="NO">Norway</option></select>';
    const el = document.getElementById('c');
    expect(fillElement(el, 'Swe')).toBe(true);
    expect(el.value).toBe('SE');
  });

  it('returns false when no select option matches', () => {
    document.body.innerHTML = '<select id="c"><option value="SE">Sweden</option></select>';
    expect(fillElement(document.getElementById('c'), 'ZZ')).toBe(false);
  });
});

describe('setNativeValue', () => {
  it('writes through the native setter', () => {
    document.body.innerHTML = '<input id="e">';
    const el = document.getElementById('e');
    setNativeValue(el, 'x');
    expect(el.value).toBe('x');
  });
});

describe('findFormScope', () => {
  it('returns the nearest enclosing form', () => {
    document.body.innerHTML = '<form id="f"><input id="e"></form>';
    const { scope, scoped } = findFormScope(document.getElementById('e'), document);
    expect(scope).toBe(document.getElementById('f'));
    expect(scoped).toBe(true);
  });

  it('falls back to the document when there is no form', () => {
    document.body.innerHTML = '<input id="e">';
    const { scope, scoped } = findFormScope(document.getElementById('e'), document);
    expect(scope).toBe(document);
    expect(scoped).toBe(false);
  });
});

describe('fillScope', () => {
  it('fills recognized empty fields and returns the count', () => {
    document.body.innerHTML = `
      <form id="f">
        <input name="email">
        <input name="cardNumber">
        <input name="unrelated">
      </form>`;
    const count = fillScope(document.getElementById('f'), { email: 'a@b.c', cardNumber: '4242' });
    expect(count).toBe(2);
    expect(document.querySelector('[name=email]').value).toBe('a@b.c');
    expect(document.querySelector('[name=cardNumber]').value).toBe('4242');
    expect(document.querySelector('[name=unrelated]').value).toBe('');
  });

  it('skips fields that already have a value', () => {
    document.body.innerHTML = '<form id="f"><input name="email" value="keep@me.com"></form>';
    const count = fillScope(document.getElementById('f'), { email: 'a@b.c' });
    expect(count).toBe(0);
    expect(document.querySelector('[name=email]').value).toBe('keep@me.com');
  });
});
