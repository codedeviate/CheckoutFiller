# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-06-04

### Added
- **Svea Checkout** outcome scenarios (Approved, Denied, Abuse / fraud flag,
  Credit limit reached) using Svea's documented test personnummer.
- **Qliro** outcome scenarios (Approved, On hold, Denied) using Qliro's documented
  test personnummer.

## [0.3.1] - 2026-06-04

### Fixed
- Corrected shipped test credentials to match official provider documentation:
  - **Kustom (KCO):** approved personnummer `194103219202` and denied
    `194110288083` (the denied scenario also sets the `customer+se+denied@klarna.com`
    email Klarna uses to trigger that outcome). Card unchanged.
  - **Nets / Nexi:** success Visa test card `4268 2700 8737 4847` (the prior
    `4925…0004` is not the documented success card in the current Nexi portal).
  - **Qliro:** approved personnummer `197906255307` (was an undocumented value).
  - **SwedbankPay:** Swish number `0739000001` and invoice personnummer
    `196003071161`; removed the "Card · Declined" scenario (Swedbank Pay triggers
    declines via "magic amounts", not a declined card number, so it can't be
    filled). Accepted card unchanged.
- Verified as already-correct: Generic (`4242…`), Svea (`194605092222`), the
  Kustom card, and the SwedbankPay accepted card.

### Note
- The SwedbankPay **Autogiro** scenario values (clearing/account) are not publicly
  documented; the scenario is labelled "Autogiro (unverified)" and its values
  remain placeholders to confirm via a Swedbank Pay test account.

## [0.3.0] - 2026-06-04

### Added
- **Scenarios:** providers can define a `scenarios` array (each `{ label, fields }`
  overriding the base) to capture payment-method and outcome variants
  (e.g. "Card · Declined", "Swish · Accepted", "Invoice · Review"). Surfaced as one
  optional menu level: provider → scenario → category. Providers without scenarios
  are unchanged.
- **SwedbankPay** provider, shipped with example scenarios.
- Six bank fields (`bankClearing`, `bankAccount`, `iban`, `bic`, `bankgiro`,
  `plusgiro`) and a **Bank / account** category; matcher detects them.

### Changed
- **Klarna (KCO) is now Kustom (KCO)** (rebrand): provider key `klarna-kco` →
  `kustom-kco` and label updated. Config schema is now version 2; stored v1 configs
  are migrated automatically on load (the rename preserves your edits, order, and a
  custom label).

## [0.2.0] - 2026-06-04

### Added
- Dedicated **Personal number** menu category that fills only the `ssn` field in
  one click (separate from Customer identity, which also includes it).
- Test personal numbers for the Generic and Nets providers (previously only
  Klarna, Svea, and Qliro shipped one).
- Broader personal-number field matching: `ssn`, `pnr`, `nin`, `fnr`, `cpr`,
  `hetu`/`henkilotunnus`, `fodselsnummer`/`fødselsnummer`, `personnummer`,
  `national id`/`national identification`, `person id`, `social security`
  (short tokens use lookarounds to avoid matching as substrings of other words).

### Fixed
- Context menu no longer throws "Cannot create item with duplicate id" on
  install/reload. Menu rebuilds are now serialized (`createMenuRebuilder`) so the
  concurrent triggers (`onInstalled` plus the seed-write's `storage.onChanged`)
  can't race their `removeAll`→`create` sequences. Menu construction and ID
  parsing were extracted to `src/background/menus.js` and unit-tested.

## [0.1.0] - 2026-06-04

### Added
- Three-level right-click context menu: **CheckoutFiller → provider → category**
  (Card / payment, Customer identity, Address, Fill everything).
- Form-scoped filling: fills recognized fields inside the right-clicked element's
  enclosing `<form>`, falling back to the whole document when there is none.
- Heuristic field matcher mapping inputs to logical keys via `autocomplete`,
  `name`/`id`/`placeholder`/`<label>` text, and input `type`.
- Native-setter value filling with `input`/`change`/`blur` dispatch so React/Vue
  controlled inputs register changes; `<select>` matching by option value or text.
- Shipped default test credentials for Generic, Klarna (KCO), Svea Checkout (SCO),
  Nets / Nexi, and Qliro.
- Options page: edit config as JSON, reset to defaults, and JSON import/export;
  config stored in `storage.local` and seeded from bundled defaults on install.
- Toolbar badge showing the number of fields filled per action.
- Cross-browser build via esbuild emitting `dist/chrome` (MV3 service worker) and
  `dist/firefox` (MV3 background scripts + `browser_specific_settings.gecko`).
- Vitest + jsdom test suite for the schema, matcher, and filler modules.

[Unreleased]: https://github.com/codedeviate/CheckoutFiller/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/codedeviate/CheckoutFiller/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/codedeviate/CheckoutFiller/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/codedeviate/CheckoutFiller/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/codedeviate/CheckoutFiller/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/codedeviate/CheckoutFiller/releases/tag/v0.1.0
