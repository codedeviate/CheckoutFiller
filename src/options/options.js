import browser from 'webextension-polyfill';
import { loadConfig, saveConfig, getDefaults } from '../common/storage.js';
import { validateConfig } from '../common/schema.js';

const $ = (id) => document.getElementById(id);

function setStatus(msg, ok = true) {
  const s = $('status');
  s.textContent = msg;
  s.className = 'status ' + (ok ? 'ok' : 'err');
}

function render(cfg) {
  $('config').value = JSON.stringify(cfg, null, 2);
}

function parseEditor() {
  let parsed;
  try {
    parsed = JSON.parse($('config').value);
  } catch (e) {
    setStatus('Invalid JSON: ' + e.message, false);
    return null;
  }
  const { valid, errors } = validateConfig(parsed);
  if (!valid) {
    setStatus('Invalid config: ' + errors.join('; '), false);
    return null;
  }
  return parsed;
}

$('save').addEventListener('click', async () => {
  const parsed = parseEditor();
  if (!parsed) return;
  try {
    await saveConfig(parsed);
    setStatus('Saved.');
  } catch (e) {
    setStatus(e.message, false);
  }
});

$('reset').addEventListener('click', async () => {
  if (!confirm('Reset config to shipped defaults?')) return;
  await saveConfig(getDefaults());
  render(getDefaults());
  syncAutoRefillCheckbox(getDefaults());
  setStatus('Reset to defaults.');
});

$('export').addEventListener('click', async () => {
  const cfg = await loadConfig();
  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'checkoutfiller-config.json';
  a.click();
  URL.revokeObjectURL(url);
});

$('import').addEventListener('click', () => $('file').click());

$('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch (err) {
    setStatus('Invalid JSON file: ' + err.message, false);
    return;
  }
  const { valid, errors } = validateConfig(parsed);
  if (!valid) {
    setStatus('Invalid config: ' + errors.join('; '), false);
    return;
  }
  await saveConfig(parsed);
  render(parsed);
  syncAutoRefillCheckbox(parsed);
  setStatus('Imported.');
});

function syncAutoRefillCheckbox(cfg) {
  $('autoRefill').checked = !!(cfg && cfg.settings && cfg.settings.autoRefill);
}

$('autoRefill').addEventListener('change', async () => {
  const parsed = parseEditor();
  if (!parsed) {
    // editor JSON is invalid; revert the checkbox to the stored value
    syncAutoRefillCheckbox(await loadConfig());
    return;
  }
  parsed.settings = { ...(parsed.settings || {}), autoRefill: $('autoRefill').checked };
  try {
    await saveConfig(parsed);
    render(parsed);
    setStatus('Saved.');
  } catch (e) {
    setStatus(e.message, false);
  }
});

async function init() {
  const cfg = await loadConfig();
  render(cfg);
  syncAutoRefillCheckbox(cfg);
}

init();
