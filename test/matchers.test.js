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

  it('matches Nordic / international personal-number field variants', () => {
    expect(detectLogicalKey(input('<input name="ssn">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input name="customer_pnr">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input name="fodselsnummer">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input id="fødselsnummer">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input name="cpr">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input name="hetu">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input placeholder="National identification number">'))).toBe('ssn');
  });

  it('matches org-number field names (NEH uses orgno for both persons and companies)', () => {
    expect(detectLogicalKey(input('<input name="orgno">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input name="customer_orgno">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input name="orgnr">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input name="org_number">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input placeholder="Organisationsnummer">'))).toBe('ssn');
    expect(detectLogicalKey(input('<input placeholder="Organization number">'))).toBe('ssn');
  });

  it('does not match personal-number tokens as substrings of unrelated names', () => {
    expect(detectLogicalKey(input('<input name="running">'))).toBeNull(); // embeds "nin"
    expect(detectLogicalKey(input('<input name="classname">'))).toBeNull(); // embeds "ssn"
    expect(detectLogicalKey(input('<input name="organizer">'))).toBeNull(); // "org" but not an org-number
  });

  it('matches via associated label text', () => {
    const el = input('<label for="x">First name</label><input id="x">');
    expect(detectLogicalKey(el)).toBe('firstName');
  });

  it('matches via placeholder', () => {
    expect(detectLogicalKey(input('<input placeholder="Your e-mail">'))).toBe('email');
  });

  it('falls back to the email input type, but NOT bare tel', () => {
    expect(detectLogicalKey(input('<input type="email">'))).toBe('email');
    // A bare type=tel with no name/label/autocomplete hint is NOT assumed to be a
    // phone — numeric fields (personnummer, card, cvc) also use type=tel.
    expect(detectLogicalKey(input('<input type="tel">'))).toBeNull();
  });

  // Regression: Qliro renders numeric fields as type=tel + autocomplete=off with
  // camelCase English names and no linked <label>. The personal-number field was
  // wrongly detected as `phone` via the old tel→phone fallback.
  it('matches a Qliro-style personal-number field as ssn, not phone', () => {
    expect(detectLogicalKey(input('<input type="tel" name="personalNumber" autocomplete="off">'))).toBe('ssn');
  });

  it('still detects real phone fields without the tel fallback', () => {
    expect(detectLogicalKey(input('<input type="tel" name="phone" autocomplete="tel">'))).toBe('phone');
    expect(detectLogicalKey(input('<input autocomplete="tel">'))).toBe('phone');
    expect(detectLogicalKey(input('<input name="mobilePhone">'))).toBe('phone');
  });

  it('matches a camelCase card-expiry field name', () => {
    expect(detectLogicalKey(input('<input type="tel" name="cardExpiry" autocomplete="off">'))).toBe('cardExp');
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

  it('matches the bank/account fields', () => {
    expect(detectLogicalKey(input('<input name="iban">'))).toBe('iban');
    expect(detectLogicalKey(input('<input name="bic">'))).toBe('bic');
    expect(detectLogicalKey(input('<input name="swift_code">'))).toBe('bic');
    expect(detectLogicalKey(input('<input name="clearing_number">'))).toBe('bankClearing');
    expect(detectLogicalKey(input('<input placeholder="Sort code">'))).toBe('bankClearing');
    expect(detectLogicalKey(input('<input name="account_number">'))).toBe('bankAccount');
    expect(detectLogicalKey(input('<input name="kontonummer">'))).toBe('bankAccount');
    expect(detectLogicalKey(input('<input name="bankgiro">'))).toBe('bankgiro');
    expect(detectLogicalKey(input('<input name="plusgiro">'))).toBe('plusgiro');
  });

  it('does not match bank tokens as substrings of unrelated names', () => {
    expect(detectLogicalKey(input('<input name="caribana">'))).toBeNull(); // embeds "iban"
    expect(detectLogicalKey(input('<input name="cubicle">'))).toBeNull();  // embeds "bic"
  });
});
