// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WtButton, WtIconButton } from './buttons';

afterEach(cleanup);

// WtButton keeps its MUI-era API and renders the v2 kit Button (src/ds/ui/button.tsx). Colours,
// depth and motion live in the kit's classes, so these tests check the mapping, not pixels.
const button = (name: string) => screen.getByRole('button', { name });
const has = (el: HTMLElement, cls: string) => el.className.split(' ').includes(cls);

describe('WtButton renders the kit Button', () => {
  test('default: compact accent CTA with neutral elevation', () => {
    render(<WtButton>Save</WtButton>);
    const b = button('Save');
    expect(b.dataset.slot).toBe('button');
    expect(has(b, 'h-10')).toBe(true);
    expect(has(b, 'from-(--brand-bright)')).toBe(true);
    expect(has(b, 'shadow-cta')).toBe(true);
  });

  test('size="medium" flat={false}: spacious hero CTA with the glow', () => {
    render(<WtButton size="medium" flat={false}>Save</WtButton>);
    const b = button('Save');
    expect(has(b, 'h-11')).toBe(true);
    expect(has(b, 'from-(--brand-bright)')).toBe(true);
    expect(has(b, 'shadow-glow')).toBe(true);
  });

  test('flat={false} glows only at the spacious size, as before', () => {
    render(<WtButton flat={false}>Save</WtButton>);
    expect(has(button('Save'), 'shadow-cta')).toBe(true);
  });

  test.each([
    [{ tone: 'danger' as const }, 'from-(--cta-danger)'],
    [{ tone: 'success' as const }, 'from-(--cta-success)'],
    [{ ghost: true }, 'border-slate-300'],
    [{ inverted: true }, 'text-(--brand)'],
  ])('%o maps to the matching kit variant', (props, cls) => {
    render(<WtButton {...props}>Go</WtButton>);
    expect(has(button('Go'), cls)).toBe(true);
  });

  test('labels are title-cased and icons keep their slots', () => {
    render(<WtButton startIcon={<i data-testid="start" />} endIcon={<i data-testid="end" />}>save draft</WtButton>);
    const b = button('Save Draft');
    expect(b.querySelector('[data-icon="inline-start"] [data-testid="start"]')).not.toBeNull();
    expect(b.querySelector('[data-icon="inline-end"] [data-testid="end"]')).not.toBeNull();
  });

  test('fullWidth, className and native props pass through', () => {
    render(<WtButton fullWidth className="me-2" type="submit" name="go">Go</WtButton>);
    const b = button('Go');
    expect(has(b, 'w-full')).toBe(true);
    expect(has(b, 'me-2')).toBe(true);
    expect(b.getAttribute('type')).toBe('submit');
    expect(b.getAttribute('name')).toBe('go');
  });

  test('a caller sx still applies on top of the kit recipe', () => {
    render(<WtButton sx={{ minWidth: 180 }}>Go</WtButton>);
    expect(getComputedStyle(button('Go')).minWidth).toBe('180px');
  });

  test('disabled cannot be activated', () => {
    const onClick = vi.fn();
    render(<WtButton disabled onClick={onClick}>Go</WtButton>);
    const b = button('Go');
    expect(b).toHaveProperty('disabled', true);
    fireEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('component="label" renders a label so a nested file input still opens', () => {
    render(<WtButton component="label">Upload<input type="file" hidden /></WtButton>);
    const b = button('Upload');
    expect(b.tagName).toBe('LABEL');
    expect(b.querySelector('input[type="file"]')).not.toBeNull();
  });

  test('MUI-only props do not leak to the DOM', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<WtButton variant="contained" color="primary" disableElevation disableRipple>Go</WtButton>);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('MUI props on the wrappers (migrated MUI buttons keep their look)', () => {
  test.each([
    [{ variant: 'text' as const }, 'hover:bg-muted'],
    [{ variant: 'outlined' as const }, 'border-slate-300'],
    [{ variant: 'contained' as const, color: 'error' as const }, 'from-(--cta-danger)'],
    [{ variant: 'contained' as const, color: 'success' as const }, 'from-(--cta-success)'],
    [{ variant: 'contained' as const, color: 'primary' as const }, 'from-(--brand-bright)'],
  ])('%o', (props, cls) => {
    render(<WtButton {...props}>Go</WtButton>);
    expect(has(button('Go'), cls)).toBe(true);
  });

  test('WtIconButton honours MUI and pixel sizes', () => {
    render(<><WtIconButton title="A" size="small">a</WtIconButton><WtIconButton title="B" size={34}>b</WtIconButton><WtIconButton title="C">c</WtIconButton></>);
    expect(has(screen.getByRole('button', { name: 'A' }), 'size-8')).toBe(true);
    expect(screen.getByRole('button', { name: 'B' }).style.width).toBe('34px');
    expect(has(screen.getByRole('button', { name: 'C' }), 'size-11')).toBe(true);
  });
});
