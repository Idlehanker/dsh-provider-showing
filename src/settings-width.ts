/**
 * Conversation width preference, as a row in Settings -> General.
 *
 * ## Why this plugin owns the row
 *
 * The Host already ships drag-to-resize on the transcript edges. That is the
 * primary control and this row does not replace it. What it adds is the two
 * things a drag handle cannot give: a NUMBER you can type, and a reset that
 * does not require pixel-hunting a 10px target.
 *
 * ## Scope, stated honestly
 *
 * The width preference is not Host state. `ConversationWidthControls` reads and
 * writes `localStorage['dsh.conversation.contentWidth']` directly, publishes it
 * as the `--dsh-chat-user-width` custom property on the conversation root, and
 * has no subscription, no store and no exposed setter. The mount is a factory
 * slot (`conversation.content` -> `widthControls`) that a settings row cannot
 * reach, and `settings.general.item` owners receive no props at all.
 *
 * So writing the key is the whole contract available to us, and the new value
 * lands when the Host next publishes widths: on the ResizeObserver pass after
 * a reload. Rather than pretend otherwise, the row says so in its own copy.
 *
 * ## What it deliberately does not do
 *
 * It does not clamp to the Host's live column width. `resolveContentWidth`
 * clamps to `columnWidth - 176`, which needs the mounted container — unknowable
 * from Settings. The Host re-clamps on read, so a stored value that is too
 * large is corrected there rather than silently rewritten here.
 *
 * @module dsh-provider-showing/settings-width
 */

/**
 * The Host's own storage key. Duplicated by VALUE, not imported: the constant
 * lives in the conversation package's private module scope and is not exported.
 * If the Host ever renames it, the failure is visible (the row stops taking
 * effect) rather than silent, and this string is the one place to change.
 */
const WIDTH_KEY = 'dsh.conversation.contentWidth'

/** The Host's floor: `CONTENT_MIN` in ConversationWidthControls. */
const MIN_WIDTH = 640

/*
 * Upper bound for the input only. The Host clamps to the live column at read
 * time, so this is a sanity rail against a typo like 99999 turning into a
 * useless stored value, not a claim about what fits on screen.
 */
const MAX_WIDTH = 2400

/** Step for the +/- buttons and the arrow keys. */
const STEP = 40

/** The stored preference, or undefined when absent/corrupt. */
function readWidth(): number | undefined {
  try {
    const raw = localStorage.getItem(WIDTH_KEY)
    if (raw === null) return undefined
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : undefined
  } catch {
    // localStorage can throw outright (private mode, disabled storage). A
    // settings row that crashes the General page is far worse than one that
    // reports "automatic".
    return undefined
  }
}

const CSS = `
.dsh-psw-row{display:flex;flex-direction:column;gap:8px;padding:12px 0;border-top:.5px solid var(--dsw-alias-border-l3)}
.dsh-psw-head{display:flex;align-items:baseline;gap:8px;justify-content:space-between}
.dsh-psw-title{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary);font-weight:500}
.dsh-psw-value{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dsh-psw-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsh-psw-input{
  width:88px;padding:4px 8px;border-radius:var(--dsw-radius-sm,rgb(69,69,69));
  border:1px solid var(--dsw-alias-border-l2,#3a3a3a);
  background:var(--dsw-alias-bg-module-platform,transparent);
  color:var(--dsw-alias-label-primary);font-size:13px;line-height:18px;
  font-variant-numeric:tabular-nums;
}
.dsh-psw-input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#5686fe);outline-offset:1px}
.dsh-psw-btn{
  appearance:none;cursor:pointer;padding:4px 10px;border-radius:var(--dsw-radius-sm,6px);
  border:1px solid var(--dsw-alias-border-l2,#3a3a3a);background:transparent;
  color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;
}
.dsh-psw-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dsh-psw-btn:disabled{opacity:.45;cursor:default}
.dsh-psw-hint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dsh-psw-warn{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-warn-label,#d19a2a)}
`

/** Inject the stylesheet once per document. */
function ensureCss(): void {
  if (typeof document === 'undefined') return
  const id = 'dsh-provider-showing/settings-width.css'
  if (document.querySelector(`style[data-plugin-css="${id}"]`) !== null) return
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-provider-showing'
  style.dataset.pluginCss = id
  style.textContent = CSS
  document.head.appendChild(style)
}

/**
 * React hooks this row needs, bound once by {@link bindSettingsReact}.
 *
 * Same discipline as the readout: the shell's React arrives through the module
 * factory's `require`, never as a top-level import, so there is exactly one
 * React instance and one hook dispatcher in the page.
 */
type ReactApi = typeof import('react')
let createElement: ReactApi['createElement']
let useState: ReactApi['useState']
let useMemo: ReactApi['useMemo']

/** Bind the shell's React instance; called from the module factory. */
export function bindSettingsReact(react: ReactApi): void {
  createElement = react.createElement
  useState = react.useState
  useMemo = react.useMemo
}

interface SettingsWidthProps {
  /** Registrant-localized copy lookup. */
  t: (key: string, vars?: Record<string, unknown>) => string
}

/** The Settings -> General row. */
export function SettingsWidthRow(props: SettingsWidthProps): unknown {
  const { t } = props

  // Seeded from storage once. A separate `draft` string is kept because an
  // input must be able to hold "10" on the way to "1040"; binding the number
  // directly would fight the user on every keystroke.
  const [stored, setStored] = useState<number | undefined>(() => readWidth())
  const [draft, setDraft] = useState<string>(() => {
    const current = readWidth()
    return current === undefined ? '' : String(current)
  })
  const [note, setNote] = useState<string | undefined>(undefined)

  // Derive, do not memoize. This is a two-line numeric parse of a string that
  // is already in state; a useMemo here would add a dependency-correctness
  // requirement to a value that cannot avoid being correct when computed
  // inline, and the row renders at human speed.
  const parsedNumber = Number(draft.trim())
  const parsed = Number.isFinite(parsedNumber) && parsedNumber > 0 ? parsedNumber : undefined

  const invalid = draft.trim() !== '' && (parsed === undefined || parsed < MIN_WIDTH || parsed > MAX_WIDTH)

  const commit = (value: number) => {
    try {
      localStorage.setItem(WIDTH_KEY, String(value))
      setStored(value)
      setDraft(String(value))
      setNote(t('width.saved'))
    } catch {
      setNote(t('width.storageBlocked'))
    }
  }

  const reset = () => {
    try {
      localStorage.removeItem(WIDTH_KEY)
      setStored(undefined)
      setDraft('')
      setNote(t('width.reset'))
    } catch {
      setNote(t('width.storageBlocked'))
    }
  }

  const nudge = (delta: number) => {
    const base = parsed ?? stored ?? MIN_WIDTH
    const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, base + delta))
    commit(next)
  }

  return createElement(
    'div',
    { className: 'dsh-psw-row' },
    createElement(
      'div',
      { className: 'dsh-psw-head' },
      createElement('span', { className: 'dsh-psw-title' }, t('width.title')),
      createElement(
        'span',
        { className: 'dsh-psw-value' },
        stored === undefined
          ? t('width.automatic')
          : t('width.current', { px: String(stored) }),
      ),
    ),
    createElement(
      'div',
      { className: 'dsh-psw-controls' },
      createElement('button', {
        type: 'button',
        className: 'dsh-psw-btn',
        'aria-label': t('width.narrower'),
        onClick: () => { nudge(-STEP) },
      }, '-'),
      createElement('input', {
        className: 'dsh-psw-input',
        type: 'number',
        inputMode: 'numeric',
        min: MIN_WIDTH,
        max: MAX_WIDTH,
        step: STEP,
        value: draft,
        placeholder: t('width.placeholder'),
        'aria-label': t('width.title'),
        'aria-invalid': invalid,
        onChange: (event: { target: { value: string } }) => {
          setDraft(event.target.value)
          setNote(undefined)
        },
        onKeyDown: (event: { key: string; preventDefault: () => void }) => {
          if (event.key !== 'Enter') return
          if (parsed === undefined || invalid) return
          event.preventDefault()
          commit(parsed)
        },
      }),
      createElement('button', {
        type: 'button',
        className: 'dsh-psw-btn',
        'aria-label': t('width.wider'),
        onClick: () => { nudge(STEP) },
      }, '+'),
      createElement('button', {
        type: 'button',
        className: 'dsh-psw-btn',
        disabled: invalid || parsed === undefined,
        onClick: () => { if (parsed !== undefined && !invalid) commit(parsed) },
      }, t('width.apply')),
      createElement('button', {
        type: 'button',
        className: 'dsh-psw-btn',
        disabled: stored === undefined,
        onClick: reset,
      }, t('width.resetButton')),
    ),
    invalid
      ? createElement('p', { className: 'dsh-psw-warn' }, t('width.invalid', { min: String(MIN_WIDTH), max: String(MAX_WIDTH) }))
      : createElement('p', { className: 'dsh-psw-hint' }, t('width.hint')),
    note === undefined ? null : createElement('p', { className: 'dsh-psw-hint' }, note),
  )
}

/** Copy for both languages, kept beside the component that uses it. */
export const WIDTH_COPY: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  en: {
    'width.title': 'Conversation width',
    'width.automatic': 'Automatic',
    'width.current': '{px} px',
    'width.placeholder': 'Auto',
    'width.narrower': 'Narrower',
    'width.wider': 'Wider',
    'width.apply': 'Apply',
    'width.resetButton': 'Reset',
    'width.reset': 'Reset to automatic — reload to see it take effect.',
    'width.saved': 'Saved — reload the page to apply.',
    'width.storageBlocked': 'This browser refused to store the preference.',
    'width.invalid': 'Enter a width between {min} and {max} px.',
    'width.hint': 'Sets the reading column. You can also drag the inner edge of either side in the conversation. Takes effect after a reload.',
  },
  zh: {
    'width.title': '对话页面宽度',
    'width.automatic': '自动',
    'width.current': '{px} px',
    'width.placeholder': '自动',
    'width.narrower': '变窄',
    'width.wider': '变宽',
    'width.apply': '应用',
    'width.resetButton': '恢复默认',
    'width.reset': '已恢复自动宽度 —— 刷新后生效。',
    'width.saved': '已保存 —— 刷新页面后生效。',
    'width.storageBlocked': '浏览器拒绝存储该偏好。',
    'width.invalid': '请输入 {min} 到 {max} px 之间的宽度。',
    'width.hint': '设置阅读栏宽度。你也可以在对话区左右内边缘直接拖动。刷新后生效。',
  },
}

/** Pick the copy table for a locale tag, defaulting to English. */
export function widthCopyFor(locale: string | undefined): Readonly<Record<string, string>> {
  return locale !== undefined && locale.toLowerCase().startsWith('zh') ? WIDTH_COPY.zh : WIDTH_COPY.en
}

/** Format a copy string with {name} placeholders. */
export function formatCopy(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => (vars[key] === undefined ? `{${key}}` : String(vars[key])))
}

/** Re-exported so the entry can call it before the first render. */
export { ensureCss as ensureSettingsCss }
