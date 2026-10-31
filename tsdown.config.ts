import { defineConfig } from 'tsdown'

/**
 * Build layout for the dual-face Host contract.
 *
 * `index` is the HOST half: a Loader row holder with no behaviour. `client` is
 * the BROWSER half, a single ESM file that self-registers through
 * `window.__ModuleLoader__`.
 *
 * Single file on purpose — the Host only serves the entry bundle plus chunks
 * named `^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$`, so an extra `impl.js`
 * would never be served and the factory's require would throw on
 * materialization.
 *
 * React is never bundled: the client half must share ONE React with the shell.
 */
export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: 'esm',
    target: 'node22',
    platform: 'neutral',
    dts: false,
    sourcemap: false,
    clean: true,
  },
  {
    entry: { client: 'src/client.ts' },
    outDir: 'lib',
    format: 'esm',
    target: 'node22',
    platform: 'neutral',
    deps: { neverBundle: ['react', 'react-dom', 'react/jsx-runtime'] },
    dts: false,
    sourcemap: false,
    clean: false,
  },
])
