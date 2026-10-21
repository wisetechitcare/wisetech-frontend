export function resolveReactComponent<T>(moduleValue: unknown): T {
  let current = moduleValue;

  for (let depth = 0; depth <= 5; depth += 1) {
    if (typeof current === 'function') return current as T;

    if (current && typeof current === 'object') {
      const reactType = (current as { $$typeof?: unknown }).$$typeof;
      if (
        reactType === Symbol.for('react.forward_ref')
        || reactType === Symbol.for('react.memo')
        || reactType === Symbol.for('react.lazy')
      ) {
        return current as T;
      }

      if (!('default' in current)) break;

      const next = (current as { default?: unknown }).default;
      if (next === undefined || next === current) break;
      current = next;
      continue;
    }

    break;
  }

  throw new TypeError('Expected a React component or a module containing one.');
}
