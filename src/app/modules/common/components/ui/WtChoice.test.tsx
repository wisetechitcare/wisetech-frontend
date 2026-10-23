// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WtChoice } from './WtChoice';

afterEach(cleanup);

describe('WtChoice', () => {
  it('uses a native switch and changes its value', () => {
    let value = false;
    const { rerender } = render(<WtChoice name="active" label="Active" variant="switch" value={value} onChange={(next) => { value = next as boolean; }} />);
    const control = screen.getByRole('switch', { name: 'Active' });
    fireEvent.click(control);
    expect(value).toBe(true);
    rerender(<WtChoice name="active" label="Active" variant="switch" value={value} onChange={(next) => { value = next as boolean; }} />);
    expect((control as HTMLInputElement).checked).toBe(true);
  });

  it('supports native radio selection and arrow navigation', () => {
    let value = 'a';
    const { rerender } = render(<WtChoice name="choice" label="Choice" variant="segmented" value={value} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} onChange={(next) => { value = next as string; }} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'A' }), { key: 'ArrowRight' });
    expect(value).toBe('b');
    rerender(<WtChoice name="choice" label="Choice" variant="segmented" value={value} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} onChange={(next) => { value = next as string; }} />);
    expect((screen.getByRole('radio', { name: 'B' }) as HTMLInputElement).checked).toBe(true);
  });

  it('associates helper and error text with the group', () => {
    render(<WtChoice name="choice" label="Choice" variant="segmented" value="" helperText="Pick one" error="Required" options={[{ value: 'a', label: 'A' }]} onChange={() => {}} />);
    const group = screen.getByRole('radiogroup');
    expect(group.getAttribute('aria-describedby')).toContain('choice-helper');
    expect(group.getAttribute('aria-describedby')).toContain('choice-error');
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('keeps segmented choices compact instead of stretching them across the row', () => {
    render(<WtChoice name="meal" label="Meal" variant="segmented" value="veg" options={[{ value: 'veg', label: 'Vegetarian' }, { value: 'nonveg', label: 'Non-vegetarian' }]} onChange={() => {}} />);
    const group = screen.getByRole('radiogroup');
    expect(window.getComputedStyle(group).display).toBe('flex');
    expect(window.getComputedStyle(group).gridTemplateColumns).toBe('none');
  });
});
