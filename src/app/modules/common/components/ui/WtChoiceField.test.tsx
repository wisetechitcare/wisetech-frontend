// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik, useFormikContext } from 'formik';
import { WtChoiceField } from './WtChoiceField';

afterEach(cleanup);

describe('WtChoiceField', () => {
  it('preserves string boolean values and clears reveal fields, touched state, and errors when disabled', async () => {
    function Values() {
      const { errors, touched, values } = useFormikContext<any>();
      return <output data-testid="values">{JSON.stringify({ values, errors, touched })}</output>;
    }

    render(<Formik initialValues={{ enabled: 'true', amount: '100', type: 'FIXED' }} initialErrors={{ amount: 'Required', type: 'Required' }} initialTouched={{ amount: true, type: true }} onSubmit={() => undefined}><form><WtChoiceField name="enabled" label="Enabled" variant="switch" options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} clearRevealOnDisable clearOnDisable={["amount", "type"]} /><Values /></form></Formik>);
    fireEvent.click(screen.getByRole('switch', { name: 'Enabled' }));
    await waitFor(() => expect(screen.getByTestId('values').textContent).toBe(JSON.stringify({ values: { enabled: 'false', amount: '', type: '' }, errors: {}, touched: { amount: false, type: false, enabled: true } })));
  });

  it('shows an edit marker only after an edit and removes it after resetForm', async () => {
    function Reset() {
      const { resetForm } = useFormikContext<any>();
      return <button type="button" onClick={() => resetForm()}>Reset</button>;
    }

    render(<Formik initialValues={{ status: 'ACTIVE' }} onSubmit={() => undefined}>
      <form>
        <WtChoiceField name="status" label="Status" variant="segmented" editMode showChangedMarker options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
        <Reset />
      </form>
    </Formik>);

    expect(screen.queryByLabelText('Changed')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Inactive' }));
    expect(screen.getByLabelText('Changed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(screen.queryByLabelText('Changed')).toBeNull());
  });
});
