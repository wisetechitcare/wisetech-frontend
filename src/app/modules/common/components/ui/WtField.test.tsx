// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Stack } from '@mui/material';
import { WtField } from './WtField';

// Two layout bugs seen on the offer form, both in this component:
//  1. `sx` reached only the input INSIDE a full-width frame, so `sx={{ flex: 1 }}` did nothing in a
//     row — two fields claimed 100% each and a neighbouring date field was squeezed to a sliver.
//  2. `searchable` rendered react-select with its label on a line ABOVE the control, so a long
//     list sat beside ordinary fields at a different height with a different label.

afterEach(cleanup);

const frameOf = (input: HTMLElement) => input.closest('.MuiTextField-root, .MuiAutocomplete-root')!.parentElement as HTMLElement;

describe('WtField', () => {
    test('default size is small (mid-density / 40px row)', () => {
        render(<WtField label="Rule Name" value="" onChange={() => {}} />);
        const root = screen.getByLabelText('Rule Name').closest('.MuiInputBase-root')!;
        expect(root.classList.contains('MuiInputBase-sizeSmall')).toBe(true);
    });

    test('size="md" stays available for spacious dialog forms', () => {
        render(<WtField label="Filter" value="" onChange={() => {}} size="md" />);
        const root = screen.getByLabelText('Filter').closest('.MuiInputBase-root')!;
        // MUI only tags the small variant; medium is the unmarked default.
        expect(root.classList.contains('MuiInputBase-sizeSmall')).toBe(false);
    });

    test('layout sx lands on the field\'s outer frame, so flex works in a row', () => {
        render(
            <Stack direction="row">
                <WtField label="Title" value="" onChange={() => {}} sx={{ flex: 1 }} />
            </Stack>,
        );
        const frame = frameOf(screen.getByLabelText('Title'));
        expect(getComputedStyle(frame).flexGrow).toBe('1');
        // …and the frame can shrink, instead of forcing its neighbours out of the row.
        expect(getComputedStyle(frame).minWidth).toBe('0px');
    });

    test('a caller-set width wins over full width when the field opts out of it', () => {
        render(<WtField label="Stage" value="" onChange={() => {}} fullWidth={false} sx={{ width: 240 }} />);
        expect(getComputedStyle(frameOf(screen.getByLabelText('Stage'))).width).toBe('240px');
    });

    test('plain select with fullWidth={false} sizes to the widest option (no ellipsis on value)', () => {
        const options = [
            { value: 'applied', label: 'Applied' },
            { value: 'shortlisted', label: 'Shortlisted' },
            { value: 'interview', label: 'Interview' },
        ];
        render(
            <WtField
                label="Stage"
                value="shortlisted"
                onChange={() => {}}
                options={options}
                fullWidth={false}
            />,
        );
        const frame = frameOf(screen.getByLabelText('Stage'));
        const frameW = parseFloat(getComputedStyle(frame).width);
        expect(frameW).toBeGreaterThan(120);
        const value = screen.getByText('Shortlisted');
        expect(getComputedStyle(value).textOverflow).not.toBe('ellipsis');
    });

    test('required select shows an asterisk and keeps the floating label', () => {
        render(
            <WtField
                label="Branch"
                value=""
                onChange={() => {}}
                options={[{ value: 'a', label: 'Alpha' }]}
                required
            />,
        );
        expect(screen.getByLabelText(/Branch/)).toBeTruthy();
        expect(document.querySelector('label')?.textContent).toMatch(/\*/);
    });

    test('error replaces hint in the one message slot and marks the helper as alert', () => {
        render(
            <WtField
                label="Stage"
                value=""
                onChange={() => {}}
                options={[{ value: 'a', label: 'Applied' }]}
                hint="Pick a stage"
                error="Stage is required"
            />,
        );
        expect(screen.queryByText('Pick a stage')).toBeNull();
        expect(screen.getByText('Stage is required').getAttribute('role')).toBe('alert');
    });

    test('empty select shows the placeholder, not a blank closed value', () => {
        render(
            <WtField
                label="Role"
                value=""
                onChange={() => {}}
                options={[{ value: 'r1', label: 'Draftman' }]}
                placeholder="All roles"
            />,
        );
        expect(screen.getByText('All roles')).toBeTruthy();
    });

    test('a searchable field keeps the floating label in the border, like every other field', () => {
        const options = Array.from({ length: 12 }, (_, i) => ({ value: `d${i}`, label: `Designation ${i}` }));
        render(<WtField label="Designation" value="" onChange={() => {}} options={options} searchable />);
        const input = screen.getByRole('combobox', { name: 'Designation' });
        const label = document.querySelector(`label[for="${input.id}"]`)!;
        expect(label.classList.contains('MuiInputLabel-root')).toBe(true);
        // The outline reserves the gap for it (a notched legend), which a label placed above never had.
        expect(input.closest('.MuiOutlinedInput-root')!.querySelector('legend span')?.textContent).toBe('Designation');
    });

    test('a searchable field filters as you type and returns the chosen value', async () => {
        const options = [
            { value: 'hvac', label: 'HVAC Engineer' },
            { value: 'elec', label: 'Electrical Engineer' },
            { value: 'plumb', label: 'Plumbing Supervisor' },
        ];
        const Harness = () => {
            const [v, setV] = useState('');
            return (
                <>
                    <WtField label="Designation" value={v} onChange={(next) => setV(typeof next === 'string' ? next : '')} options={options} searchable />
                    <output data-testid="value">{v}</output>
                </>
            );
        };
        render(<Harness />);
        const combo = screen.getByRole('combobox', { name: 'Designation' });
        await userEvent.type(combo, 'elec');
        // jsdom + Popper often sets `data-popper-reference-hidden` (zero layout boxes), and our
        // boundary SSOT applies pointer-events:none — assert via list content + keyboard select.
        const shown = await screen.findAllByRole('option', { hidden: true });
        expect(shown.map((o) => o.textContent)).toEqual(['Electrical Engineer']);
        await userEvent.keyboard('{Enter}');
        expect(screen.getByTestId('value').textContent).toBe('elec');
    });
});
