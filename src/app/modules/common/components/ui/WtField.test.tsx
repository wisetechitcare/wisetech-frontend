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
                    <WtField label="Designation" value={v} onChange={setV} options={options} searchable />
                    <output data-testid="value">{v}</output>
                </>
            );
        };
        render(<Harness />);
        await userEvent.type(screen.getByRole('combobox', { name: 'Designation' }), 'elec');
        const shown = await screen.findAllByRole('option');
        expect(shown.map((o) => o.textContent)).toEqual(['Electrical Engineer']);
        await userEvent.click(shown[0]);
        expect(screen.getByTestId('value').textContent).toBe('elec');
    });
});
