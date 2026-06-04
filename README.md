<p align="center">
  <img src="design/icon.svg" alt="CheckoutFiller icon" width="96" height="96">
</p>

# CheckoutFiller

A Manifest V3 browser extension that fills **checkout test credentials** into the
form you right-click — via a three-level context menu (**CheckoutFiller → provider
→ category**). It sets field values and fires the events frameworks listen for, but
it **never submits**. You stay in control of the checkout flow.

Built for developers who constantly test payment flows locally and on dev servers
and are tired of remembering each provider's test email, card number, SSN, and
address.

- **Chrome / Arc** — primary target (Chromium MV3).
- **Firefox / Zen** — supported from the same codebase (Gecko MV3).

---

## How it works

```
right-click inside a checkout form
   └─ CheckoutFiller
        ├─ Generic test card ┐
        ├─ Kustom (KCO)       │   each provider expands to:
        ├─ Svea Checkout (SCO)├─►   ├─ Card / payment
        ├─ Nets / Nexi        │     ├─ Customer identity
        ├─ Qliro              │     ├─ Address
        └─ SwedbankPay       ┘     ├─ Personal number
                                    ├─ Bank / account
                                    └─ Fill everything
```

Some providers add a **scenario** level (provider → scenario → category) for
payment-method and outcome variants like "Card · Declined", "Swish · Accepted", or
"Invoice · Review". Scenarios are defined per provider in the config; providers
without them go straight to the category list.

One click on a category fills every recognized field for it. The toolbar badge
briefly shows how many fields were filled.

**Form scoping.** A content script records the element you right-clicked. When you
pick a category, the extension walks up to that element's nearest enclosing
`<form>` and fills only the recognized fields inside it. If there's no enclosing
form, it falls back to the whole document. (Cross-origin, provider-hosted payment
iframes are out of reach — see [Known limitation](#known-limitation).)

**Field matching.** Each form input is mapped to a logical field key by heuristics,
in priority order: `autocomplete` attribute → `name`/`id`/`placeholder`/`<label>`
text → input `type`. Already-filled fields are skipped.

**Value setting.** Values are written through the native `value` setter (walking
the prototype chain) and then `input`, `change`, and `blur` events are dispatched —
this is what makes React/Vue-controlled inputs actually register the change.

---

## Install (load unpacked)

```bash
npm install
npm run build      # emits dist/chrome/ and dist/firefox/
```

**Chrome / Arc:** open `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select `dist/chrome`.

**Firefox / Zen:** open `about:debugging#/runtime/this-firefox` → **Load Temporary
Add-on** → select `dist/firefox/manifest.json`. (Temporary add-ons are removed when
the browser restarts; reload after each restart.)

To test on `file://` pages, enable *Allow access to file URLs* for the extension in
Chrome.

---

## Distribute to colleagues

Releases are the distribution channel. Pushing a version tag builds, tests, and
attaches per-browser zips to a GitHub Release automatically (see
`.github/workflows/release.yml`):

```bash
# bump the version in package.json + src/manifest.base.json, commit, then:
git tag v0.4.0
git push origin v0.4.0      # CI builds, tests, and publishes the Release with zips
```

Colleagues then:

1. Open the repo's **Releases** page and download `checkoutfiller-chrome-<version>.zip`
   (or `…-firefox-<version>.zip`).
2. Unzip it.
3. **Chrome / Arc:** `chrome://extensions` → Developer mode → **Load unpacked** →
   select the unzipped `chrome` folder. **Firefox / Zen:** `about:debugging` →
   **Load Temporary Add-on** → pick `firefox/manifest.json`.

Updating is the same flow with the newer zip (remove the old unpacked entry first,
or just reload). To build the zips locally without CI: `npm run package` →
`dist/checkoutfiller-chrome-<version>.zip` and `…-firefox-<version>.zip`.

> For hands-off auto-updates across the office you'd need managed Chrome
> (`ExtensionInstallForcelist` policy) or a store listing; the zip + Load-unpacked
> flow above is the no-infrastructure option.

---

## Usage

1. Open a checkout page (or `examples/sample-checkout.html` from this repo).
2. Right-click inside the form.
3. **CheckoutFiller** → pick a provider → pick a category.
4. The recognized fields fill; the toolbar badge shows the count (`!` means the
   page had no content script — reload the tab and retry).

---

## Configure

Open the extension's **options page** (right-click the toolbar icon → *Options*, or
via the extensions page). The options page is the source of truth:

- **Edit** the config as JSON and **Save** (validated before storing).
- **Reset to defaults** restores the shipped credentials.
- **Export JSON** downloads your current config; **Import JSON** loads one back.

Config is stored per-browser in `storage.local`. The shipped defaults live in
[`src/config/defaults.json`](src/config/defaults.json) and seed storage on first
install.

> **Test credentials rotate.** The provider-specific SSNs and card numbers in the
> defaults are sandbox values that providers occasionally change. If a provider
> rejects them, check that provider's current developer docs and update via the
> options page. The generic Visa/Mastercard test numbers are long-stable.

### Config shape

```jsonc
{
  "version": 2,
  "providers": {
    "<provider-key>": {
      "label": "Shown in the menu",
      "fields": {
        // any subset of the logical keys below (the provider's base data)
        "email": "...", "phone": "...", "firstName": "...", "lastName": "...",
        "ssn": "...", "address1": "...", "postalCode": "...", "city": "...",
        "country": "SE", "cardNumber": "...", "cardExp": "MM/YY",
        "cardCvc": "...", "cardName": "...",
        "bankClearing": "...", "bankAccount": "...", "iban": "...", "bic": "...",
        "bankgiro": "...", "plusgiro": "..."
      },
      // optional: payment-method / outcome variants, each overriding a subset
      // of the base fields above. Adds a scenario level to the menu.
      "scenarios": [
        { "label": "Card · Declined", "fields": { "cardNumber": "..." } },
        { "label": "Swish · Accepted", "fields": { "phone": "..." } }
      ]
    }
  }
}
```

Categories map to these logical keys:

| Category          | Logical keys |
|-------------------|--------------|
| Card / payment    | `cardNumber`, `cardExp`, `cardCvc`, `cardName` |
| Customer identity | `email`, `phone`, `firstName`, `lastName`, `ssn` |
| Address           | `address1`, `postalCode`, `city`, `country` |
| Personal number   | `ssn` only (quick-fill the national ID on its own) |
| Bank / account    | `bankClearing`, `bankAccount`, `iban`, `bic`, `bankgiro`, `plusgiro` |
| Fill everything   | all of the above |

---

## Development

```bash
npm test           # run the vitest suite (jsdom)
npm run test:watch # watch mode
npm run build      # build both dist/chrome and dist/firefox
npm run build:watch # rebuild dist/chrome on change (for live iteration in Arc/Chrome)
```

After `npm run build:watch`, reload the unpacked extension in the browser to pick up
changes (Chromium reloads content scripts on extension reload).

See [CLAUDE.md](CLAUDE.md) for architecture and module responsibilities.

---

## Known limitation

**Cross-origin, provider-hosted payment iframes cannot be filled.** When a provider
renders its card fields inside its own sandboxed cross-origin iframe (common for
hosted card inputs), no extension content script can reach into them — that's a
browser security boundary, not a bug. CheckoutFiller fills your own same-origin
checkout forms and same-origin fields.

---

## License

Personal tool — not currently licensed for redistribution.
