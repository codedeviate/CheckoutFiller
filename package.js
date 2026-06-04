import { execFileSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Zip each built browser target in dist/ into a versioned archive ready to attach
// to a GitHub Release. Run `npm run package` (which builds first). Uses the system
// `zip` binary (present on macOS and the GitHub ubuntu runners).
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, 'dist');
const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

for (const target of ['chrome', 'firefox']) {
  if (!existsSync(resolve(DIST, target))) {
    throw new Error(`dist/${target} not found — run "npm run build" first`);
  }
  const zip = `checkoutfiller-${target}-${version}.zip`;
  rmSync(resolve(DIST, zip), { force: true });
  // -r recurse, -X drop extra file attributes for reproducible archives.
  execFileSync('zip', ['-r', '-X', zip, target], { cwd: DIST, stdio: 'inherit' });
  console.log(`packaged dist/${zip}`);
}
