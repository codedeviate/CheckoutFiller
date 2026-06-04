# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CheckoutFiller is a Manifest V3 WebExtension that fills checkout **test
credentials** into the right-clicked form via a context menu (provider → category).
It fills and fires change events but never submits. It targets Chromium (Chrome,
Arc) and Gecko (Firefox, Zen) from one shared `src/` using `webextension-polyfill`.

## Commands

```bash
npm install          # install deps
npm test             # run the full vitest suite (jsdom env)
npm run test:watch   # vitest watch mode
npx vitest run test/matchers.test.js   # run a single test file
npm run build        # bundle src/ → dist/chrome AND dist/firefox (both manifests)
npm run build:watch  # rebuild dist/chrome on change (primary dev loop)
```

There is no lint step configured. Load the built extension unpacked from
`dist/chrome` (chrome://extensions) or `dist/firefox/manifest.json`
(about:debugging) — see README for details.

## Conventions

- **Conventional Commits** for all messages (`feat:`, `fix:`, `refactor:`,
  `chore:`, `docs:`, `test:`).
- **Semantic Versioning**; keep `CHANGELOG.md` (Keep a Changelog format) and the
  `version` in `package.json` / `src/manifest.base.json` in sync on release.
- Use the `browser.*` API everywhere (via `webextension-polyfill`), never raw
  `chrome.*` — that's what keeps the single codebase cross-browser.

## Architecture

The design separates **pure, unit-tested logic** from **browser entry points** that
are verified by loading the extension. Tests cover only the pure modules.

### Data flow (a fill action)

1. `content/index.js` records the last right-clicked element (capture-phase
   `contextmenu` listener).
2. `background/service-worker.js` builds the context menu from the stored config and,
   on a category click, resolves that provider+category into a `{key: value}` map
   and `tabs.sendMessage`s it to the content script **in the clicked frame**
   (`frameId`).
3. `content/index.js` receives `CHECKOUTFILLER_FILL`, computes the form scope from
   the recorded element (`findFormScope`), and fills it (`fillScope`).
4. The service worker flashes the toolbar badge with the returned fill count.

### Modules and responsibilities

| File | Responsibility | Tested |
|------|----------------|--------|
| `src/common/schema.js` | Logical field keys, category→keys mapping, `validateConfig`. Pure, no deps. | ✅ `test/schema.test.js` |
| `src/content/matchers.js` | `detectLogicalKey(el)` — heuristics mapping a DOM input to a logical key. Pure. | ✅ `test/matchers.test.js` |
| `src/content/filler.js` | `findFormScope`, `setNativeValue`, `fillElement`, `fillScope` — DOM mutation + events. Depends on matchers. | ✅ `test/filler.test.js` |
| `src/common/storage.js` | `loadConfig`/`saveConfig`/`seedDefaults` over `browser.storage.local`, seeded from defaults. | manual |
| `src/config/defaults.json` | Shipped provider test credentials. Validated against `schema.js`. | — |
| `src/content/index.js` | Content entry: recorder + fill message handler. | manual |
| `src/background/menus.js` | `menuItems` (pure descriptors), `parseMenuId`, `createMenuRebuilder` (serialized removeAll→create). | ✅ `test/menus.test.js` |
| `src/background/service-worker.js` | Wires events: seed, build menus, route clicks, badge. | manual |
| `src/options/options.{html,css,js}` | Config editor + JSON import/export. | manual |
| `src/manifest.base.json` + `build.js` | Shared manifest + esbuild build emitting per-browser dist/. | manual |

### Key invariants (don't break these)

- **Native setter, then events.** `setNativeValue` walks the prototype chain to the
  native `value` setter; a plain `el.value =` is swallowed by React. After setting,
  always dispatch `input`, `change`, `blur`.
- **Menu IDs** are `fill:<providerKey>:<scenarioToken>:<category>`. `parseMenuId`
  (`src/background/menus.js`) pops `category` (last colon-segment) then
  `scenarioToken` (next; `-` → no scenario, else an index), leaving the remainder
  — which may itself contain colons — as the provider key.
- **Menu rebuilds are serialized** via `createMenuRebuilder` (`menus.js`). Multiple
  triggers (`onInstalled` plus the seed-write's `storage.onChanged`, `onStartup`,
  config edits) can fire concurrently; without serialization the overlapping
  `removeAll`→`create` sequences cause "Cannot create item with duplicate id".
- **Logical field keys** are the single source of truth in `schema.js` (`LOGICAL_KEYS`,
  `CATEGORIES`). The matcher returns these keys; `defaults.json` and the options
  validator use them. Adding a field means touching all three consistently.
- **Scenarios** are an optional `scenarios: [{label, fields}]` array on a provider;
  fill = base `fields` merged with the chosen scenario's override
  (`scenarioFields`). Menu leaf ids are `fill:<pkey>:<scenarioToken>:<cat>`
  (`scenarioToken` = index or `-`). `migrateConfig` (schema.js) upgrades stored v1
  configs (renames `klarna-kco` → `kustom-kco`); `CONFIG_VERSION` is 2.
- **Two manifests** are generated from `manifest.base.json` in `build.js`: Chrome
  uses `background.service_worker`; Firefox uses `background.scripts` +
  `browser_specific_settings.gecko`. esbuild outputs IIFE bundles that work for both.
- **Auto-refill** is opt-in via `settings.autoRefill` (default off;
  `autoRefillEnabled(config)` in schema.js). When on, the background sends
  `autoRefill: true` with the fill message and `content/index.js` arms
  `createAutoRefiller(document, fields)` (filler.js) — a MutationObserver that
  re-runs `fillScope` on newly-revealed empty fields for a sliding 15s window
  (same frame only; self-disarms on idle/navigation; a new fill replaces it).

### Adding a provider

Edit `src/config/defaults.json` (or via the options page at runtime). No code change
needed — menus are built dynamically from the config.

### Adding a logical field

1. Add the key to `LOGICAL_KEYS` and the right group in `CATEGORIES` (`schema.js`).
2. Add detection heuristics to `AUTOCOMPLETE_MAP` / `NAME_PATTERNS` (`matchers.js`)
   and a test in `test/matchers.test.js`.
3. Add the value to providers in `defaults.json`.

## Known limitation

Cross-origin, provider-hosted payment iframes cannot be filled (browser security
boundary). The extension fills same-origin checkout forms only.
