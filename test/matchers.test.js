import { describe, it, expect, beforeEach } from 'vitest';
import { detectLogicalKey } from '../src/content/matchers.js';

function input(html) {
  document.body.innerHTML = html;
  return document.body.querySelector('input, select, textarea');
}

describe('detectLogicalKey', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('matches via autocomplete attribute (highest priority)', () => {
    expect(detectLogicalKey(input('<input autocomplete="cc-number">'))).toBe('cardNumber');
    expect(detectLogicalKey(input('<input autocomplete="email">'))).toBe('email');
    expect(detectLogicalKey(input('<input autocomplete="postal-code">'))).toBe('postalCode');
  });

  it('reads the last token of a multi-token autocomplete value', () => {
    expect(detectLogicalKey(input('<input autocomplete="shipping cc-csc">'))).toBe('cardCvc');
  });

  it('matches via name/id regex', () => {
    expect(detectLogicalKey(input('<input name="cardNumber">'))).toBe('cardNumber');
    expect(detectLogicalKey(input('<input id="card_cvv">'))).toBe('cardCvc');
    expect(detectLogicalKey(input('<input name="personnummer">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input name="zipCode">'))).toBe('postalCode');
  });

  it('matches via associated label text', () => {
    const el = input('<label for="x">First name</label><input id="x">');
    expect(detectLogicalKey(el)).toBe('firstName');
  });

  it('matches via placeholder', () => {
    expect(detectLogicalKey(input('<input placeholder="Your e-mail">'))).toBe('email');
  });

  it('falls back to input type', () => {
    expect(detectLogicalKey(input('<input type="email">'))).toBe('email');
    expect(detectLogicalKey(input('<input type="tel">'))).toBe('phone');
  });

  it('returns null for unfillable or unknown inputs', () => {
    expect(detectLogicalKey(input('<input type="hidden" name="email">'))).toBeNull();
    expect(detectLogicalKey(input('<input type="submit">'))).toBeNull();
    expect(detectLogicalKey(input('<input disabled name="email">'))).toBeNull();
    expect(detectLogicalKey(input('<input name="totally_unrelated">'))).toBeNull();
  });

  it('detects a select element', () => {
    expect(detectLogicalKey(input('<select name="country"></select>'))).toBe('country');
  });

  it('autocomplete wins over a conflicting name', () => {
    expect(detectLogicalKey(input('<input autocomplete="tel" name="email">'))).toBe('phone');
  });

  it('matches expiry across separators but not unrelated "exp" words', () => {
    expect(detectLogicalKey(input('<input name="exp_month">'))).toBe('cardExp');
    expect(detectLogicalKey(input('<input name="card-expiry">'))).toBe('cardExp');
    expect(detectLogicalKey(input('<input name="export_format">'))).toBeNull();
  });

  it('does not match cvc/csc as a substring of unrelated names', () => {
    expect(detectLogicalKey(input('<input name="csci_value">'))).toBeNull();
  });

  it('does not treat a credit-card type selector as the card number', () => {
    expect(detectLogicalKey(input('<select name="credit_card_type"></select>'))).toBeNull();
  });
});
