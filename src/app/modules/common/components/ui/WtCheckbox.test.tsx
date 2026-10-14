// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { WtCheckbox, WtCheckboxField } from './checkbox';

afterEach(cleanup);

describe('WtCheckbox', () => {
  test('renders the branded off/on tiles (not the stock MUI glyph)', () => {
    const { container, rerender } = render(<WtCheckbox checked={false} onChange={() => {}} />);
    expect(container.querySelector('[data-wt-cb="off"]')).toBeTruthy();
    rerender(<WtCheckbox checked onChange={() => {}} />);
    expect(container.querySelector('[data-wt-cb="on"]')).toBeTruthy();
  });

  test('WtCheckboxField toggles and keeps a labelled control', async () => {
    const Harness = () => {
      const [on, setOn] = useState(false);
      return (
        <WtCheckboxField
          label="Exclude from salary"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
        />
      );
    };
    render(<Harness />);
    const box = screen.getByRole('checkbox', { name: /exclude from salary/i }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    await userEvent.click(box);
    expect(box.checked).toBe(true);
  });
});
