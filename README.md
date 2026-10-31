# dsh-provider-showing

English | [简体中文](README.zh.md)

Show **which LLM provider the current session is running on** — in the composer
toolbar, always visible, in words.

> Built for a [DeepSeek Harness](https://github.com/deepseek-ai/dsh) profile with
> several provider plugins installed. When the model trigger collapses to a bare
> icon, this answers "which provider is this turn on?" without opening a menu.

```
WorkBuddy · deepseek-v4.1-flash  high
```

**The provider is the subject; the model is the qualifier.** With more than one
route installed, the provider name is the thing you scan for, so it carries the
accent colour and the weight. The model id and reasoning tier follow as muted
secondary text.

| field | treatment | why |
|---|---|---|
| provider | accent colour, bold | the question this plugin answers |
| model | muted, ellipsized | the qualifier |
| effort | small chip | rarely changes, useful when it does |

Hovering shows the raw `provider · model · effort` triple, which is what a bug
report should quote.

## Install

```sh
pnpm --dir ~/.dsh/profiles/web add /absolute/path/to/dsh-provider-showing-1.1.0.tgz
kill -TERM "$(cat ~/.dsh/daemon/.dsh-web.pid)"   # the supervisor relaunches it
```

The bundle carries its own `cordis.patch.yml`, so it inserts its Loader row and
needs no hand edit of the profile. One caveat worth knowing: `pnpm --dir <target>`
resolves a relative `file:` path against **the target directory**, not your
shell's cwd — pass an absolute path.

## Design notes

**Provider-agnostic by construction.** It knows nothing about credits, regions or
any specific provider plugin. It reads the Host's `modelSelection` session
projection and prints what it finds, so it works for a provider that ships no UI
of its own.

**`next` wins over `lastUsed`.** A selection that has landed but not yet been
sent is still what the composer displays. Reading `lastUsed` there would name the
previous model at the moment you just changed it.

**Never hides itself.** The only degraded state is a brand-new blank session,
which renders `no provider yet` rather than nothing — so an empty row is never
ambiguous between "no provider" and "plugin broken".

**Unknown providers print their raw id.** An id missing from the label table is
still a correct answer to "which provider am I on?"; a blank would not be.

**Stateless.** One projection read per render. No state, no effects, no timers,
no network.

### Why the label table is static

The Host publishes a per-provider `displayName` in the model catalog
(`groups[].name`), but `conversation.input.right` receives only the standard hook
set — `useProjection`, `useSession`, `useInput` and friends, with no catalog
face. Reading it would need a second injection path for a cosmetic string, so the
plugin ships a small table instead. Each entry was read off the provider's own
registration rather than guessed:

| route id | label | source |
|---|---|---|
| `workbuddy` | WorkBuddy | `dsh-connect-workbuddy` `WORKBUDDY_PROVIDER_DISPLAY_NAMES.cn` |
| `workbuddy-global` | WorkBuddy Global | same, `.global` |
| `our-free-model` | Our Free Model | `dsh-our-free-model` route key |
| `deepseek-official` | DeepSeek | `dsh-llm-deepseek-api-key` `displayName` |
| `deepseek-account` | DeepSeek | `dsh-llm-deepseek-account` |

Adding a route costs one line.

## Adjusting the conversation width

Not this plugin's job — **the Host already ships it.** Drag the vertical edge
inside either side of the transcript column: the cursor turns to `col-resize` and
the width persists in `localStorage` under `dsh.conversation.contentWidth`
(clamped to a 640 px floor). The handles appear only while a conversation is
active, and are hidden while a composer overlay is open.

To set it without dragging, from the browser console:

```js
localStorage.setItem('dsh.conversation.contentWidth', '1040')
```

...then reload. Remove the key to return to the automatic width
(`clamp(680px, 64% of the column, 920px)`).

## How the bundle is built

Two entries, because the Host composes a **dual-face** package:

| file | role |
|---|---|
| `lib/index.js` | host half — a Loader row holder, no behaviour |
| `lib/client.js` | browser half — self-registers via `window.__ModuleLoader__` |

The client bundle is a **single file** on purpose. The Host serves the entry plus
on-demand chunks matching `^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$`, so a plain
`impl.js` chunk would never be served and the factory's `require` would throw at
materialization.

Four contract rules, each enforced by `ci.yml` because each is a way the bundle
fails **silently** in the browser:

1. `window.__ModuleLoader__.load({ id, factory })` must be present — the Host's
   loader is a lazy CJS table, not an ES module system.
2. No top-level `import` — a bare specifier has no import map to resolve it, so
   the entry never materializes.
3. The registration **id must be the package name** — the boot graph is keyed by
   package.
4. React must arrive through the factory's `require`, so the component shares the
   shell's single React instance; a second copy would carry a different hook
   dispatcher.

## Layout

```
src/client.ts   browser entry: registers the factory
src/impl.ts     the readout component and stylesheet
src/index.ts    host half (empty apply)
cordis.patch.yml  the bundle patch that mounts it
```

## Dev

```sh
pnpm install
pnpm typecheck
pnpm build
pnpm pack        # produces the tarball to install
```

## License

MIT
