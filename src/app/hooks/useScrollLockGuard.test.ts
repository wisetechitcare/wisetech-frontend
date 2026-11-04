// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { releaseStrandedScrollLock } from './useScrollLockGuard';

afterEach(() => {
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  document.body.className = '';
  document.documentElement.removeAttribute('style');
});

describe('releaseStrandedScrollLock', () => {
  it('clears a lock that no overlay holds, with a stray Bootstrap backdrop', () => {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '15px';
    document.body.classList.add('modal-open');
    document.body.innerHTML = '<div class="modal-backdrop fade show"></div>';
    expect(releaseStrandedScrollLock()).toBe(true);
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.paddingRight).toBe('');
    expect(document.body.classList.contains('modal-open')).toBe(false);
    expect(document.querySelector('.modal-backdrop')).toBeNull();
  });

  it('leaves the lock alone while a Bootstrap modal, MUI modal or aria-modal overlay is open', () => {
    for (const html of [
      '<div class="modal show"></div>',
      '<div class="MuiModal-root"></div>',
      '<div role="dialog" aria-modal="true"></div>',
    ]) {
      document.body.innerHTML = html;
      document.body.style.overflow = 'hidden';
      expect(releaseStrandedScrollLock()).toBe(false);
      expect(document.body.style.overflow).toBe('hidden');
    }
  });

  it('ignores a closed MUI modal that is only kept mounted', () => {
    document.body.innerHTML = '<div class="MuiModal-root MuiModal-hidden"></div>';
    document.body.style.overflow = 'hidden';
    expect(releaseStrandedScrollLock()).toBe(true);
  });

  it('does nothing when the page is not locked', () => {
    expect(releaseStrandedScrollLock()).toBe(false);
  });
});
