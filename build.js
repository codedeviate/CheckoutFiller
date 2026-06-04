import * as esbuild from 'esbuild';
import { mkdirSync, rmSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, 'src');
const DIST = resolve(__dirname, 'dist');
const watch = process.argv.includes('--watch');

const base = JSON.parse(readFileSync(resolve(SRC, 'manifest.base.json'), 'utf8'));

const TARGETS = {
  chrome: {
    background: { service_worker: 'service-worker.js' },
  },
  firefox: {
    background: { scripts: ['service-worker.js'] },
    browser_specific_settings: {
      gecko: { id: 'checkoutfiller@thomas', strict_min_version: '121.0' },
    },
  },
};

function buildOptions(outdir) {
  return {
    entryPoints: {
      'service-worker': resolve(SRC, 'background/service-worker.js'),
      content: resolve(SRC, 'content/index.js'),
      options: resolve(SRC, 'options/options.js'),
    },
    outdir,
    bundle: true,
    format: 'iife',
    target: ['chrome111', 'firefox121'],
    loader: { '.json': 'json' },
    logLevel: 'info',
  };
}

function emitStatic(out, extra) {
  copyFileSync(resolve(SRC, 'options/options.html'), resolve(out, 'options.html'));
  copyFileSync(resolve(SRC, 'options/options.css'), resolve(out, 'options.css'));
  writeFileSync(resolve(out, 'manifest.json'), JSON.stringify({ ...base, ...extra }, null, 2));
}

async function buildTarget(name, extra) {
  const out = resolve(DIST, name);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  if (watch && name === 'chrome') {
    const ctx = await esbuild.context(buildOptions(out));
    await ctx.watch();
    emitStatic(out, extra);
    console.log('watching dist/chrome (esbuild) ...');
  } else {
    await esbuild.build(buildOptions(out));
    emitStatic(out, extra);
    console.log(`built dist/${name}`);
  }
}

if (watch) {
  await buildTarget('chrome', TARGETS.chrome);
} else {
  for (const [name, extra] of Object.entries(TARGETS)) {
    await buildTarget(name, extra);
  }
}
