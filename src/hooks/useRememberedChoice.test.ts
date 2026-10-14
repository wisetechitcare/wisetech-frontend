// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRememberedChoice } from './useRememberedChoice';

const KEY = 'test:view-mode';
const MODES = ['board', 'list'] as const;

describe('useRememberedChoice', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    test('falls back when nothing is stored', () => {
        const { result } = renderHook(() => useRememberedChoice(KEY, MODES, 'board'));
        expect(result.current[0]).toBe('board');
    });

    test('a choice is kept and read back', () => {
        const first = renderHook(() => useRememberedChoice(KEY, MODES, 'board'));
        act(() => first.result.current[1]('list'));
        expect(first.result.current[0]).toBe('list');

        // A fresh mount is what a reload looks like.
        const second = renderHook(() => useRememberedChoice(KEY, MODES, 'board'));
        expect(second.result.current[0]).toBe('list');
    });

    test('a stored value that is no longer a mode falls back instead of wedging the screen', () => {
        // What a key left behind by an older build looks like. Trusting it would put the view in a
        // mode the UI no longer renders, with no way back.
        localStorage.setItem(KEY, 'kanban-v1');
        const { result } = renderHook(() => useRememberedChoice(KEY, MODES, 'board'));
        expect(result.current[0]).toBe('board');
    });

    test('a private window throws on read, and the screen still works', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('blocked');
        });
        const { result } = renderHook(() => useRememberedChoice(KEY, MODES, 'board'));
        expect(result.current[0]).toBe('board');
    });

    test('a blocked write still switches the view for this session', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('blocked');
        });
        const { result } = renderHook(() => useRememberedChoice(KEY, MODES, 'board'));
        act(() => result.current[1]('list'));
        expect(result.current[0]).toBe('list');
    });
});
