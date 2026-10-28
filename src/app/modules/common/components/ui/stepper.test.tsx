// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WtStepper } from './stepper';

afterEach(cleanup);

describe('WtStepper navigation', () => {
  const steps = [{ label: 'Identity' }, { label: 'Contact' }, { label: 'Review' }];

  it('renders named native navigation buttons and permits explicitly allowed future steps', () => {
    const navigate = vi.fn();
    render(<WtStepper steps={steps} activeStep={0} orientation="vertical" allowFutureNavigation onStepClick={navigate} />);
    const review = screen.getByRole('button', { name: 'Review' }) as HTMLButtonElement;
    expect(review.disabled).toBe(false);
    expect(review.tabIndex).toBe(0);
    fireEvent.click(review);
    expect(navigate).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: 'Identity' }).getAttribute('aria-current')).toBe('step');
  });

  it('keeps future steps read-only under the default navigation policy', () => {
    const navigate = vi.fn();
    render(<WtStepper steps={steps} activeStep={0} orientation="vertical" onStepClick={navigate} />);
    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull();
    expect(screen.getByText('Review')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });
});
