// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { WtButton } from './buttons';

afterEach(cleanup);

describe('WtButton defaults', () => {
  test('uses the compact flat accent recipe by default', () => {
    render(<WtButton>Save</WtButton>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.classList.contains('MuiButton-sizeSmall')).toBe(true);
    expect(getComputedStyle(button).backgroundImage).toContain('37, 99, 235');
    expect(getComputedStyle(button).boxShadow).toContain('rgba(16,24,40');
  });

  test('preserves explicit size, tone, and glow overrides', () => {
    render(<WtButton size="medium" tone="primary" flat={false}>Save</WtButton>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.classList.contains('MuiButton-sizeMedium')).toBe(true);
    expect(getComputedStyle(button).backgroundImage).toContain('30, 58, 138');
    expect(getComputedStyle(button).boxShadow).toContain('#1e3a8a');
  });
});
