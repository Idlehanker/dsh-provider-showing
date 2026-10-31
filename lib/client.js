// src/settings-width.ts
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
const WIDTH_KEY = "dsh.conversation.contentWidth";
/** The Host's floor: `CONTENT_MIN` in ConversationWidthControls. */
const MIN_WIDTH = 640;
const MAX_WIDTH = 2400;
/** Step for the +/- buttons and the arrow keys. */
const STEP = 40;
/** The stored preference, or undefined when absent/corrupt. */
function readWidth() {
	try {
		const raw = localStorage.getItem(WIDTH_KEY);
		if (raw === null) return void 0;
		const value = Number(raw);
		return Number.isFinite(value) && value > 0 ? value : void 0;
	} catch {
		return;
	}
}
const CSS$1 = `
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
`;
/** Inject the stylesheet once per document. */
function ensureCss$1() {
	if (typeof document === "undefined") return;
	const id = "dsh-provider-showing/settings-width.css";
	if (document.querySelector(`style[data-plugin-css="${id}"]`) !== null) return;
	const style = document.createElement("style");
	style.dataset.plugin = "dsh-provider-showing";
	style.dataset.pluginCss = id;
	style.textContent = CSS$1;
	document.head.appendChild(style);
}
let createElement$1;
let useState;
/** Bind the shell's React instance; called from the module factory. */
function bindSettingsReact(react) {
	createElement$1 = react.createElement;
	useState = react.useState;
	react.useMemo;
}
/** The Settings -> General row. */
function SettingsWidthRow(props) {
	const { t } = props;
	const [stored, setStored] = useState(() => readWidth());
	const [draft, setDraft] = useState(() => {
		const current = readWidth();
		return current === void 0 ? "" : String(current);
	});
	const [note, setNote] = useState(void 0);
	const parsedNumber = Number(draft.trim());
	const parsed = Number.isFinite(parsedNumber) && parsedNumber > 0 ? parsedNumber : void 0;
	const invalid = draft.trim() !== "" && (parsed === void 0 || parsed < MIN_WIDTH || parsed > MAX_WIDTH);
	const commit = (value) => {
		try {
			localStorage.setItem(WIDTH_KEY, String(value));
			setStored(value);
			setDraft(String(value));
			setNote(t("width.saved"));
		} catch {
			setNote(t("width.storageBlocked"));
		}
	};
	const reset = () => {
		try {
			localStorage.removeItem(WIDTH_KEY);
			setStored(void 0);
			setDraft("");
			setNote(t("width.reset"));
		} catch {
			setNote(t("width.storageBlocked"));
		}
	};
	const nudge = (delta) => {
		const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, (parsed ?? stored ?? MIN_WIDTH) + delta));
		commit(next);
	};
	return createElement$1("div", { className: "dsh-psw-row" }, createElement$1("div", { className: "dsh-psw-head" }, createElement$1("span", { className: "dsh-psw-title" }, t("width.title")), createElement$1("span", { className: "dsh-psw-value" }, stored === void 0 ? t("width.automatic") : t("width.current", { px: String(stored) }))), createElement$1("div", { className: "dsh-psw-controls" }, createElement$1("button", {
		type: "button",
		className: "dsh-psw-btn",
		"aria-label": t("width.narrower"),
		onClick: () => {
			nudge(-40);
		}
	}, "-"), createElement$1("input", {
		className: "dsh-psw-input",
		type: "number",
		inputMode: "numeric",
		min: MIN_WIDTH,
		max: MAX_WIDTH,
		step: STEP,
		value: draft,
		placeholder: t("width.placeholder"),
		"aria-label": t("width.title"),
		"aria-invalid": invalid,
		onChange: (event) => {
			setDraft(event.target.value);
			setNote(void 0);
		},
		onKeyDown: (event) => {
			if (event.key !== "Enter") return;
			if (parsed === void 0 || invalid) return;
			event.preventDefault();
			commit(parsed);
		}
	}), createElement$1("button", {
		type: "button",
		className: "dsh-psw-btn",
		"aria-label": t("width.wider"),
		onClick: () => {
			nudge(STEP);
		}
	}, "+"), createElement$1("button", {
		type: "button",
		className: "dsh-psw-btn",
		disabled: invalid || parsed === void 0,
		onClick: () => {
			if (parsed !== void 0 && !invalid) commit(parsed);
		}
	}, t("width.apply")), createElement$1("button", {
		type: "button",
		className: "dsh-psw-btn",
		disabled: stored === void 0,
		onClick: reset
	}, t("width.resetButton"))), invalid ? createElement$1("p", { className: "dsh-psw-warn" }, t("width.invalid", {
		min: String(MIN_WIDTH),
		max: String(MAX_WIDTH)
	})) : createElement$1("p", { className: "dsh-psw-hint" }, t("width.hint")), note === void 0 ? null : createElement$1("p", { className: "dsh-psw-hint" }, note));
}
/** Copy for both languages, kept beside the component that uses it. */
const WIDTH_COPY = {
	en: {
		"width.title": "Conversation width",
		"width.automatic": "Automatic",
		"width.current": "{px} px",
		"width.placeholder": "Auto",
		"width.narrower": "Narrower",
		"width.wider": "Wider",
		"width.apply": "Apply",
		"width.resetButton": "Reset",
		"width.reset": "Reset to automatic — reload to see it take effect.",
		"width.saved": "Saved — reload the page to apply.",
		"width.storageBlocked": "This browser refused to store the preference.",
		"width.invalid": "Enter a width between {min} and {max} px.",
		"width.hint": "Sets the reading column. You can also drag the inner edge of either side in the conversation. Takes effect after a reload."
	},
	zh: {
		"width.title": "对话页面宽度",
		"width.automatic": "自动",
		"width.current": "{px} px",
		"width.placeholder": "自动",
		"width.narrower": "变窄",
		"width.wider": "变宽",
		"width.apply": "应用",
		"width.resetButton": "恢复默认",
		"width.reset": "已恢复自动宽度 —— 刷新后生效。",
		"width.saved": "已保存 —— 刷新页面后生效。",
		"width.storageBlocked": "浏览器拒绝存储该偏好。",
		"width.invalid": "请输入 {min} 到 {max} px 之间的宽度。",
		"width.hint": "设置阅读栏宽度。你也可以在对话区左右内边缘直接拖动。刷新后生效。"
	}
};
/** Pick the copy table for a locale tag, defaulting to English. */
function widthCopyFor(locale) {
	return locale !== void 0 && locale.toLowerCase().startsWith("zh") ? WIDTH_COPY.zh : WIDTH_COPY.en;
}
/** Format a copy string with {name} placeholders. */
function formatCopy(template, vars) {
	return template.replace(/\{(\w+)\}/g, (_m, key) => vars[key] === void 0 ? `{${key}}` : String(vars[key]));
}
// src/impl.ts
let createElement;
let useMemo;
/** Bind the shell's React instance; called once from the module factory. */
function bindReact(react) {
	createElement = react.createElement;
	useMemo = react.useMemo;
	bindSettingsReact(react);
}
/** Stable browser-plugin name. */
const name = "dsh-provider-showing-client";
/**
* Client services required.
*
* Only `slots`: this plugin reads a session projection the Host already
* publishes, so it needs no settings scope, no locale face and no remote API.
* Declaring fewer services is what keeps `apply` from being parked behind a
* provider that is slow to mount.
*/
const inject = ["slots"];
/** The composer row's trailing list seat: rendered before the model picker. */
const SLOT = "conversation.input.right";
/**
* The Settings -> General row seat.
*
* Declared by ui-settings-general's General entry, so it exists only while that
* page is mounted -- `ctx.slots.inject` queues the registration until then
* rather than losing it.
*/
const SETTINGS_ITEM = "settings.general.item";
/** Position among the row's occupants; lower is further left. */
const ORDER = 2;
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
const PROVIDER_LABELS = {
	"workbuddy": "WorkBuddy",
	"workbuddy-global": "WorkBuddy Global",
	"our-free-model": "Our Free Model",
	"deepseek-official": "DeepSeek",
	"deepseek-account": "DeepSeek"
};
/**
* What the readout shows for a provider id: a name when one is known, the raw
* id otherwise. Unknown never means blank -- "unknown provider" is still an
* answer, while a gap in the row is not.
*/
function providerLabel(provider) {
	return PROVIDER_LABELS[provider] ?? provider;
}
/** Narrow a projection to the selection worth showing, or undefined. */
function currentSelection(projection) {
	if (projection === void 0) return void 0;
	const raw = projection.next ?? projection.lastUsed;
	if (raw === null || raw === void 0) return void 0;
	return raw;
}
/** A non-empty string, or undefined. Guards against a half-written selection. */
function stringOf(value) {
	return typeof value === "string" && value.trim() !== "" ? value : void 0;
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
`;
/** Inject the stylesheet once per document. */
function ensureCss() {
	if (typeof document === "undefined") return;
	const id = "dsh-provider-showing/readout.css";
	if (document.querySelector(`style[data-plugin-css="${id}"]`) !== null) return;
	const style = document.createElement("style");
	style.dataset.plugin = "dsh-provider-showing";
	style.dataset.pluginCss = id;
	style.textContent = CSS;
	document.head.appendChild(style);
}
/**
* The readout itself.
*
* Reads the projection through the Host-injected `useProjection` hook rather
* than any polling loop: the projection is a live session face, so a model
* switch re-renders this without a timer, a fetch or a subscription.
*/
function ProviderReadout(props) {
	const { useProjection } = props;
	const projection = useProjection === void 0 ? void 0 : useProjection("modelSelection");
	const selection = useMemo(() => currentSelection(projection), [projection]);
	const provider = stringOf(selection?.provider);
	const model = stringOf(selection?.model);
	const effort = stringOf(selection?.reasoningEffort);
	if (provider === void 0) return createElement("span", { className: "dsh-provider-showing" }, createElement("span", { className: "dsh-provider-showing-trigger" }, createElement("span", { className: "dsh-provider-showing-empty" }, "no provider yet")));
	return createElement("span", { className: "dsh-provider-showing" }, createElement("span", {
		className: "dsh-provider-showing-trigger",
		title: effort === void 0 ? `${provider} · ${model ?? ""}` : `${provider} · ${model ?? ""} · ${effort}`
	}, createElement("span", { className: "dsh-provider-showing-provider" }, providerLabel(provider)), model === void 0 ? null : [createElement("span", {
		key: "sep",
		className: "dsh-provider-showing-sep"
	}, "·"), createElement("span", {
		key: "model",
		className: "dsh-provider-showing-model"
	}, model)], effort === void 0 ? null : createElement("span", { className: "dsh-provider-showing-effort" }, effort)));
}
/**
* The row as the settings slot renders it.
*
* The slot hands an item only its own props (no `label`, no locale face), so
* the copy lookup is built here: pick the table by the document language and
* close over it. Reading `document.documentElement.lang` rather than a locale
* service keeps this to zero extra dependencies for one row -- and a locale
* switch re-renders the page anyway, which re-runs this.
*/
function SettingsWidthSlotRow() {
	const copy = widthCopyFor(typeof document === "undefined" ? void 0 : document.documentElement.lang);
	const t = (key, vars) => {
		const template = copy[key];
		if (template === void 0) return key;
		return vars === void 0 ? template : formatCopy(template, vars);
	};
	return SettingsWidthRow({ t });
}
/** Register the readout into the composer row. */
function apply(ctx) {
	ensureCss();
	try {
		ctx.slots.inject(SLOT, () => ctx.slots.register({
			name: SLOT,
			id: "dsh-provider-showing",
			order: ORDER
		}, ProviderReadout));
	} catch (error) {
		console.error("[dsh-provider-showing] slot registration failed:", error);
	}
	ensureCss$1();
	try {
		ctx.slots.inject(SETTINGS_ITEM, () => ctx.slots.register({
			name: SETTINGS_ITEM,
			id: "dsh-provider-showing-width",
			order: 12
		}, SettingsWidthSlotRow));
	} catch (error) {
		console.error("[dsh-provider-showing] settings row registration failed:", error);
	}
}
// src/client.ts
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
globalThis.__ModuleLoader__.load({
	id: "dsh-provider-showing",
	factory: (require) => {
		bindReact(require("react"));
		return {
			name,
			inject,
			apply
		};
	}
});
