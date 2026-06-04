import browser from 'webextension-polyfill';
import { findFormScope, fillScope } from './filler.js';

let lastTarget = null;

document.addEventListener(
  'contextmenu',
  (e) => { lastTarget = e.target; },
  true,
);

browser.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== 'CHECKOUTFILLER_FILL') return undefined;
  const { scope, scoped } = findFormScope(lastTarget, document);
  const count = fillScope(scope, msg.fields || {});
  return Promise.resolve({ count, scoped });
});
