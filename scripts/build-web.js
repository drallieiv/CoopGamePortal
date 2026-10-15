import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function bundleApps() {
  console.log('[Build] Bundling Angular 22 SPAs with esbuild...');

  const apps = [
    {
      name: 'client',
      entry: path.join(root, 'apps/client/src/main.ts'),
      html: path.join(root, 'apps/client/src/index.html'),
      outdir: path.join(root, 'apps/client/dist/public')
    },
    {
      name: 'studio',
      entry: path.join(root, 'apps/studio/src/main.ts'),
      html: path.join(root, 'apps/studio/src/index.html'),
      outdir: path.join(root, 'apps/studio/dist/public')
    }
  ];

  for (const app of apps) {
    fs.mkdirSync(app.outdir, { recursive: true });

    await build({
      entryPoints: [app.entry],
      outfile: path.join(app.outdir, 'bundle.js'),
      bundle: true,
      minify: true,
      sourcemap: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2022'
    });

    if (fs.existsSync(app.html)) {
      fs.copyFileSync(app.html, path.join(app.outdir, 'index.html'));
    }

    console.log(`[Build]  ${app.name} bundled to ${app.outdir}`);
  }

  console.log('[Build] All web bundles generated successfully.');
}

bundleApps().catch(err => {
  console.error('[Build] Web bundling failed:', err);
  process.exit(1);
});
