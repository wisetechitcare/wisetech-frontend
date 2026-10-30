/**
 * Default export of a CommonJS package that sets `exports.default` (Babel/TS-compiled CJS).
 *
 * The dev server's dependency prebundle hands such a package's whole `exports` object to a
 * default import (`{ default: Component }`) instead of unwrapping it, and rendering that object
 * throws "Element type is invalid ... got: object". Production builds unwrap it themselves, so
 * this passes the value through unchanged there.
 *
 * Known offenders (found by loading every npm default import in the browser): react-flatpickr,
 * react-signature-canvas. A new CJS component package that crashes only in dev belongs here too.
 */
export function cjsDefault<T>(mod: T): T {
    return (mod as unknown as { default?: T }).default ?? mod;
}
