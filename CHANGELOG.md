# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/codedeviate/CheckoutFiller/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/codedeviate/CheckoutFiller/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/codedeviate/CheckoutFiller/releases/tag/v0.1.0
