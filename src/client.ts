/**
 * Browser entry: register this plugin's factory with the Host's module system.
 *
 * ## The contract this file implements
 *
 * The Host's client module system is a lazy CJS table. A served bundle must only
 * REGISTER a factory — `window.__ModuleLoader__.load({ id, factory })` — and the
 * runtime materializes it later (`factory(require) -> exports`), memoized on
 * first import.
 *
 * Two rules this file exists to honour:
 *
 * 1. **The id must be the PACKAGE name.** The Host composes its boot graph BY
 *    PACKAGE, so a bundle registered under any other id is never found.
 * 2. **Nothing may run at script-parse time.** `./impl.ts` is imported
 *    statically so its code is inlined here, but every side effect it has
 *    (the stylesheet injection) lives inside `apply()`, which the runtime calls
 *    at mount — never while this script is being parsed.
 *
 * ## Why one file
 *
 * The Host serves the entry bundle plus on-demand chunks whose names must match
 * `^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$`. A plain `impl.js` chunk is not
 * servable, so splitting the implementation out would make the factory's
 * require throw at materialization. Inlining is what keeps one artifact.
 *
 * React must reach the component through the SHELL's instance, which is why the
 * build keeps it external: a second copy would carry a different hook
 * dispatcher and break `useMemo`.
 *
 * @module dsh-provider-showing/client
 */

import { apply, bindReact, inject, name } from './impl.ts'

interface ModuleLoaderWindow {
  __ModuleLoader__: {
    load(entry: {
      id: string
      factory: (require: (spec: string) => unknown) => unknown
    }): void
  }
}

const loaderWindow = globalThis as unknown as ModuleLoaderWindow

loaderWindow.__ModuleLoader__.load({
  id: 'dsh-provider-showing',
  factory: (require) => {
    // The shell's React, resolved through the loader — never bundled, never a
    // top-level ESM import.
    bindReact(require('react') as Parameters<typeof bindReact>[0])
    return { name, inject, apply }
  },
})
