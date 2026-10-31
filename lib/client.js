// src/impl.ts
let createElement;
let useMemo;
/** Bind the shell's React instance; called once from the module factory. */
function bindReact(react) {
	createElement = react.createElement;
	useMemo = react.useMemo;
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
