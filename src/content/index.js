import browser from 'webextension-polyfill';
import { findFormScope, fillScope, createAutoRefiller } from './filler.js';

let lastTarget = null;
let activeRefiller = null;

document.addEventListener(
  'contextmenu',
  (e) => { lastTarget = e.target; },
  true,
);

browser.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== 'CHECKOUTFILLER_FILL') return undefined;
  const fields = msg.fields || {};
  const { scope, scoped } = findFormScope(lastTarget, document);
  const count = fillScope(scope, fields);

  // Replace any prior refiller, then arm a fresh one if requested. Watching the
  // whole frame document (not just the clicked form) so later wizard steps fill.
  if (activeRefiller) {
    activeRefiller.disarm();
    activeRefiller = null;
  }
  if (msg.autoRefill) {
    activeRefiller = createAutoRefiller(document, fields);
  }

  return Promise.resolve({ count, scoped });
});
