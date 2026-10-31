/**
 * Provider readout for the composer toolbar.
 *
 * ## The problem this solves
 *
 * With several provider plugins installed (this machine runs `workbuddy`,
 * `workbuddy-global` and `our-free-model`), the composer's model trigger often
 * shows only an ICON. The Host collapses the label when the row is narrow —
 * `[data-model-compact]` flips `--dsh-composer-model-text-display` to `none` —
 * so "which provider am I on?" becomes unanswerable without opening the menu
 * and reading a group heading.
 *
 * The information is not missing, only out of sight: the Host's `modelSelection`
 * session projection carries `provider`, `model` and `reasoningEffort` for the
 * selection in flight. This plugin renders exactly that, in words, in the
 * composer row.
 *
 * ## Why it is provider-agnostic on purpose
 *
 * It must work for EVERY provider, including ones that ship no UI of their own.
 * So it knows nothing about WorkBuddy, credits or regions: it reads the
 * projection and prints what it finds. Provider display names are suggestions
 * with a fallback, never a closed list — an unknown id prints as itself rather
 * than disappearing, because "unknown provider" is still an answer while a
 * blank row is not.
 *
 * ## Why the readout never hides itself
 *
 * A readout that vanishes when something is "off" is worse than none: the user
 * cannot tell "no provider" from "plugin broken". So the only null return is
 * "the Host has not told us a selection yet" (a brand-new blank session), and
 * even then it renders a neutral placeholder rather than nothing.
 *
 * @module dsh-provider-showing/client
 */

import type { Context } from '@deepseek-ai/cordis'

/**
 * React is bound lazily, never imported at module scope.
 *
 * The Host serves this file as a module-loader bundle whose factory receives a
 * `require`; a top-level `import ... from "react"` would emit an ESM import the
 * browser cannot resolve, and the module would fail to materialize. The factory
 * calls {@link bindReact} before the plugin is usable.
 */
type ReactApi = typeof import('react')

let createElement: ReactApi['createElement']
let useMemo: ReactApi['useMemo']

/** Bind the shell's React instance; called once from the module factory. */
export function bindReact(react: ReactApi): void {
  createElement = react.createElement
  useMemo = react.useMemo
}

/**
 * The one `ctx.slots` capability this plugin uses.
 *
 * Declared locally rather than imported: the slots service type lives in the
 * Host's client packages, which this package must NOT depend on at runtime (it
 * shares React and the module loader with the shell). A narrow local interface
 * keeps the build hermetic and states exactly what is used.
 */
interface SlotsFace {
  inject(name: string, register: () => (() => void) | undefined): unknown
  register(
    options: { name: string; id: string; order?: number },
    component: (props: ReadoutProps) => unknown,
  ): () => void
}

/** The context shape this plugin needs. */
type PluginContext = Context & { slots: SlotsFace }

/** Stable browser-plugin name. */
export const name = 'dsh-provider-showing-client'

/**
 * Client services required.
 *
 * Only `slots`: this plugin reads a session projection the Host already
 * publishes, so it needs no settings scope, no locale face and no remote API.
 * Declaring fewer services is what keeps `apply` from being parked behind a
 * provider that is slow to mount.
 */
export const inject = ['slots']

/** The composer row's trailing list seat: rendered before the model picker. */
const SLOT = 'conversation.input.right'

/** Position among the row's occupants; lower is further left. */
const ORDER = 2

/**
 * Display names for the provider routes this machine installs.
 *
 * These are NOT guesses: each was read off the provider's own registration.
 *
 *   workbuddy / workbuddy-global  dsh-connect-workbuddy
 *                                 `WORKBUDDY_PROVIDER_DISPLAY_NAMES`
 *   our-free-model                dsh-our-free-model's route key
 *   deepseek-official             dsh-llm-deepseek-api-key
 *                                 `displayName: "DeepSeek"`
 *   deepseek-account              dsh-llm-deepseek-account (same label)
 *
 * A static table is a deliberate trade, not laziness. The Host DOES publish a
 * per-provider `displayName` in the model catalog (`groups[].name`), but
 * `conversation.input.right` receives only the standard hook set --
 * `useProjection`, `useSession`, `useInput` and friends, no catalog face -- so
 * this slot cannot read it. Asking for it would mean a second injection path
 * for a cosmetic string. The consequence is honest and bounded: a provider
 * this table does not know prints its raw route id, which is still a correct
 * answer to "which provider am I on?".
 */
const PROVIDER_LABELS: Readonly<Record<string, string>> = {
  // dsh-connect-workbuddy registers these two names verbatim.
  'workbuddy': 'WorkBuddy',
  'workbuddy-global': 'WorkBuddy Global',
  // dsh-our-free-model's own route key.
  'our-free-model': 'Our Free Model',
  // dsh-llm-deepseek-api-key registers `displayName: "DeepSeek"`, and
  // llm-deepseek-account registers the account-backed variant.
  'deepseek-official': 'DeepSeek',
  'deepseek-account': 'DeepSeek',
}

/**
 * What the readout shows for a provider id: a name when one is known, the raw
 * id otherwise. Unknown never means blank -- "unknown provider" is still an
 * answer, while a gap in the row is not.
 */
function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider
}
/**
 * One selection out of the Host's `modelSelection` projection.
 *
 * The projection publishes `{ lastUsed, next }` where `next` is
 * `pending ?? lastUsed`, so a switch that has landed but not yet been sent is
 * already visible — which is what a user pressing the picker expects to see.
 */
interface SelectionLike {
  provider?: unknown
  model?: unknown
  reasoningEffort?: unknown
}

interface ProjectionLike {
  lastUsed?: SelectionLike | null
  next?: SelectionLike | null
}

/** Narrow a projection to the selection worth showing, or undefined. */
function currentSelection(projection: ProjectionLike | undefined): SelectionLike | undefined {
  if (projection === undefined) return undefined
  // `next` wins over `lastUsed`: a landed-but-unsent switch is still what the
  // composer displays, and reading `lastUsed` there would show the previous
  // model at the exact moment the user just changed it.
  const raw = projection.next ?? projection.lastUsed
  if (raw === null || raw === undefined) return undefined
  return raw
}

/** A non-empty string, or undefined. Guards against a half-written selection. */
function stringOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

const CSS = `
/* THE PROVIDER IS THE SUBJECT, THE MODEL IS THE QUALIFIER.
   With three provider routes installed, "which provider is this turn on?" is
   the question the row must answer at a glance. So the provider name carries
   the accent colour and the weight, while the model name sits in the same
   muted tone as the shell's neighbouring controls. Reversing that hierarchy
   (the old equal-weight "A . B" shape) made the reader parse two words to
   find the one that mattered. */
.dsh-provider-showing{display:inline-flex;align-items:center;gap:4px;min-width:0;max-width:min(380px,46cqw)}
.dsh-provider-showing-trigger{
  appearance:none;display:inline-flex;align-items:center;gap:5px;align-self:stretch;
  padding:2px 6px;border:0;border-radius:6px;background:transparent;
  font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#999);
  white-space:nowrap;cursor:default;min-width:0;
}
/* Accent + weight: this is the field that must be readable WITHOUT reading. */
.dsh-provider-showing-provider{
  font-weight:700;flex:none;
  color:var(--dsw-alias-brand-primary,#5686fe);
  letter-spacing:.01em;
}
.dsh-provider-showing-sep{opacity:.35;flex:none}
/* Secondary: ellipsized, tabular, muted. */
.dsh-provider-showing-model{
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;
  font-variant-numeric:tabular-nums;
  color:var(--dsw-alias-label-tertiary,#999);
}
.dsh-provider-showing-effort{
  flex:none;padding:0 4px;border-radius:4px;
  background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));
  font-size:11px;line-height:16px;color:var(--dsw-alias-label-caption,#888);
  font-variant-numeric:tabular-nums;
}
.dsh-provider-showing-empty{font-style:italic;opacity:.7}
`

/** Inject the stylesheet once per document. */
function ensureCss(): void {
  if (typeof document === 'undefined') return
  const id = 'dsh-provider-showing/readout.css'
  if (document.querySelector(`style[data-plugin-css="${id}"]`) !== null) return
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-provider-showing'
  style.dataset.pluginCss = id
  style.textContent = CSS
  document.head.appendChild(style)
}

interface ReadoutProps {
  useProjection?: (key: string) => unknown
}

/**
 * The readout itself.
 *
 * Reads the projection through the Host-injected `useProjection` hook rather
 * than any polling loop: the projection is a live session face, so a model
 * switch re-renders this without a timer, a fetch or a subscription.
 */
function ProviderReadout(props: ReadoutProps): unknown {
  const { useProjection } = props
  const projection = useProjection === undefined
    ? undefined
    : (useProjection('modelSelection') as ProjectionLike | undefined)

  const selection = useMemo(() => currentSelection(projection), [projection])
  const provider = stringOf(selection?.provider)
  const model = stringOf(selection?.model)
  const effort = stringOf(selection?.reasoningEffort)

  // Brand-new session: the Host has not recorded a selection yet. Say so
  // rather than rendering nothing, so the row's absence is never ambiguous
  // between "no provider" and "plugin silent".
  if (provider === undefined) {
    return createElement(
      'span',
      { className: 'dsh-provider-showing' },
      createElement(
        'span',
        { className: 'dsh-provider-showing-trigger' },
        createElement('span', { className: 'dsh-provider-showing-empty' }, 'no provider yet'),
      ),
    )
  }

  return createElement(
    'span',
    { className: 'dsh-provider-showing' },
    createElement(
      'span',
      {
        className: 'dsh-provider-showing-trigger',
        // The full id is in the tooltip: the visible text may be a friendly
        // name, and the exact routing id is what a bug report needs.
        title: effort === undefined ? `${provider} · ${model ?? ''}` : `${provider} · ${model ?? ''} · ${effort}`,
      },
      // PROVIDER FIRST, and visually the heaviest thing in the pill: the one
      // question this plugin answers is "which provider is this turn on?",
      // and with three routes installed the provider name is the whole answer.
      // The model is the qualifier that follows it.
      createElement('span', { className: 'dsh-provider-showing-provider' }, providerLabel(provider)),
      model === undefined
        ? null
        : [
            createElement('span', { key: 'sep', className: 'dsh-provider-showing-sep' }, '·'),
            createElement('span', { key: 'model', className: 'dsh-provider-showing-model' }, model),
          ],
      effort === undefined
        ? null
        : createElement('span', { className: 'dsh-provider-showing-effort' }, effort),
    ),
  )
}

/** Register the readout into the composer row. */
export function apply(ctx: PluginContext): void {
  ensureCss()
  try {
    ctx.slots.inject(SLOT, () => ctx.slots.register(
      {
        name: SLOT,
        id: 'dsh-provider-showing',
        order: ORDER,
        // No `locale`: this plugin ships no translations. The visible text is
        // provider ids, model ids and effort tiers — none of which a
        // translation would improve, and a locale face would be one more
        // service to wait on before the row can paint.
      },
      ProviderReadout,
    ))
  } catch (error) {
    // A failed slot registration must not take the page down: the composer is
    // the Host's, and losing one readout is recoverable by reloading.
    console.error('[dsh-provider-showing] slot registration failed:', error)
  }
}
