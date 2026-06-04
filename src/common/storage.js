import browser from 'webextension-polyfill';
import defaults from '../config/defaults.json';
import { validateConfig } from './schema.js';

export const CONFIG_KEY = 'checkoutfiller.config';

export function getDefaults() {
  return defaults;
}

export async function loadConfig() {
  const stored = await browser.storage.local.get(CONFIG_KEY);
  return stored[CONFIG_KEY] || defaults;
}

export async function saveConfig(config) {
  const { valid, errors } = validateConfig(config);
  if (!valid) throw new Error('Invalid config: ' + errors.join('; '));
  await browser.storage.local.set({ [CONFIG_KEY]: config });
}

export async function seedDefaults() {
  const stored = await browser.storage.local.get(CONFIG_KEY);
  if (!stored[CONFIG_KEY]) {
    await browser.storage.local.set({ [CONFIG_KEY]: defaults });
  }
}
