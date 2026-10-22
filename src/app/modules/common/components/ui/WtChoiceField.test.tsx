// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik, useFormikContext } from 'formik';
import { WtChoiceField } from './WtChoiceField';

afterEach(cleanup);

describe('WtChoiceField', () => {
  it('preserves string boolean values and clears reveal fields when disabled', async () => {
    function Values() {
      const { values } = useFormikContext<any>();
      return <output data-testid="values">{JSON.stringify(values)}</output>;
    }

    render(<Formik initialValues={{ enabled: 'true', amount: '100', type: 'FIXED' }} onSubmit={() => undefined}><form><WtChoiceField name="enabled" label="Enabled" variant="switch" options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} clearOnDisable={["amount", "type"]} /><Values /></form></Formik>);
    fireEvent.click(screen.getByRole('switch', { name: 'Enabled' }));
    await waitFor(() => expect(screen.getByTestId('values').textContent).toBe(JSON.stringify({ enabled: 'false', amount: '', type: '' })));
  });
});
