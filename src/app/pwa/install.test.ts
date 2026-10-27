// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIos, isStandalone } from './install';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('PWA environment detection', () => {
  it('detects standalone display mode', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    expect(isStandalone()).toBe(true);
  });

  it('does not treat a normal browser tab as standalone', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    expect(isStandalone()).toBe(false);
  });

  it('detects iOS for Add to Home Screen instructions', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    expect(isIos()).toBe(true);
  });
});
