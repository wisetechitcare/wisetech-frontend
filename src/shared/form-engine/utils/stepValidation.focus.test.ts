// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusFieldOrError } from './stepValidation';

const mountInput = (name: string) => {
  const input = document.createElement('input');
  input.name = name;
  document.body.appendChild(input);
  const scroll = vi.fn();
  Object.defineProperty(input, 'scrollIntoView', { configurable: true, value: scroll });
  return { input, scroll };
};

const stubReducedMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query }));

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('focusFieldOrError', () => {
  it('smooth-scrolls and focuses the field, reporting that focus moved', () => {
    stubReducedMotion(false);
    const { input, scroll } = mountInput('email');
    expect(focusFieldOrError('email')).toBe(true);
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(document.activeElement).toBe(input);
  });

  it('scrolls instantly under prefers-reduced-motion', () => {
    stubReducedMotion(true);
    const { scroll } = mountInput('email');
    focusFieldOrError('email');
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });

  it('reports false when nothing could take focus', () => {
    stubReducedMotion(false);
    expect(focusFieldOrError(null)).toBe(false);
    expect(focusFieldOrError('missing')).toBe(false);
  });
});
