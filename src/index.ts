/**
 * Host half: deliberately empty.
 *
 * A client half is served for packages that hold a Loader row, so this file
 * exists only to occupy one. This plugin registers no provider, no route and
 * no service — it reads the Host's existing `modelSelection` session
 * projection from the browser and renders it.
 */

export const name = 'dsh-provider-showing'

/** No-op: contributes nothing to the Host. */
export function apply(): void {}
