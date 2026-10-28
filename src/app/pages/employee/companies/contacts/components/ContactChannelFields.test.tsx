// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik, useFormikContext } from 'formik';
import { ContactChannelFields, toChannelPayload, toChannelRows } from './ContactChannelFields';

afterEach(cleanup);

function Emails() {
  const { values } = useFormikContext<any>();
  return <output data-testid="emails">{JSON.stringify(toChannelPayload(values.emails))}</output>;
}

const renderEmails = (emails: string[]) =>
  render(
    <Formik initialValues={{ emails: toChannelRows('emails', undefined, emails) }} onSubmit={() => undefined}>
      <form>
        <ContactChannelFields kind="emails" />
        <Emails />
      </form>
    </Formik>,
  );

const payload = () => JSON.parse(screen.getByTestId('emails').textContent || '[]');

describe('ContactChannelFields', () => {
  it('starts with one empty primary row, and Add appends a non-primary one', async () => {
    renderEmails([]);
    expect(screen.getByText('Primary')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /add email/i }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /make email 2 primary/i })).toHaveLength(1));
  });

  it('Make primary moves the flag; removing the primary hands it to the first row left', async () => {
    renderEmails(['old@work.example', 'me@personal.example']);
    expect(payload().map((e: any) => e.isPrimary)).toEqual([true, false]);

    fireEvent.click(screen.getByRole('button', { name: /make email 2 primary/i }));
    await waitFor(() => expect(payload().map((e: any) => e.isPrimary)).toEqual([false, true]));

    fireEvent.click(screen.getByRole('button', { name: /remove email 2/i }));
    await waitFor(() => expect(payload()).toEqual([{ value: 'old@work.example', label: null, isPrimary: true }]));
  });

  it('API channels win over the legacy columns', () => {
    const rows = toChannelRows(
      'phones',
      [
        { id: '1', type: 'PHONE', value: '9000000001', label: 'Work', isPrimary: false },
        { id: '2', type: 'PHONE', value: '9876543210', label: 'Mobile', isPrimary: true },
        { id: '3', type: 'EMAIL', value: 'x@y.io', isPrimary: true },
      ],
      ['1111111111'],
    );
    expect(rows.map((r) => [r.value, r.isPrimary])).toEqual([['9000000001', false], ['9876543210', true]]);
  });
});
