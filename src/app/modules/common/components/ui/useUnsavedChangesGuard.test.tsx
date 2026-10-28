// @vitest-environment jsdom

import { useState } from 'react';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';
import { UnsavedChangesProvider } from './UnsavedChangesProvider';
import { createMemoryRouter, Link, RouterProvider, useLocation } from 'react-router-dom';
import { ConfigureFormDialog } from './ConfigureFormDialog';
import { GlassDialog, PlainDialogHeader } from './glass';
import { GlassDialogActions } from './GlassDialogActions';
import { UnsavedChangesModal as BootstrapModal } from './UnsavedChangesModal';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field, Form, Formik } from 'formik';
import TextInput from '../../inputs/TextInput';

afterEach(cleanup);

function GuardedForm({ dirty, onClose }: { dirty: boolean; onClose: () => void }) {
  const { requestClose, dialog } = useUnsavedChangesGuard(dirty, onClose);
  const location = useLocation();

  return (
    <>
      <button type="button" onClick={requestClose}>Cancel</button>
      <Link to="/next">Navigate</Link>
      <output>{location.pathname}</output>
      {dialog}
    </>
  );
}

function renderGuardedForm(dirty: boolean, onClose = vi.fn()) {
  const router = createMemoryRouter(
    [
      {
        path: '/form',
        element: (
          <UnsavedChangesProvider>
            <GuardedForm dirty={dirty} onClose={onClose} />
          </UnsavedChangesProvider>
        ),
      },
      { path: '/next', element: <output>Next page</output> },
    ],
    { initialEntries: ['/form'] },
  );

  return { ...render(<RouterProvider router={router} />), onClose, router };
}

function renderConfigureDialog(dirty: boolean, onClose = vi.fn()) {
  const router = createMemoryRouter(
    [
      {
        path: '/form',
        element: (
          <UnsavedChangesProvider>
            <ConfigureFormDialog
              open
              dirty={dirty}
              onClose={onClose}
              title="Edit details"
              onSubmit={() => undefined}
            >
              <input aria-label="Name" />
            </ConfigureFormDialog>
          </UnsavedChangesProvider>
        ),
      },
    ],
    { initialEntries: ['/form'] },
  );

  return { ...render(<RouterProvider router={router} />), onClose };
}

function FormikDirtyRoute() {
  return (
    <Formik initialValues={{ name: '' }} onSubmit={() => undefined}>
      {(formik) => (
        <Form>
          <TextInput isRequired={false} label="Name" formikField="name" />
          <button type="button" onClick={() => formik.resetForm()}>Save</button>
          <Link to="/next">Navigate</Link>
        </Form>
      )}
    </Formik>
  );
}

function FormikGlassDialog({ onClose }: { onClose: () => void }) {
  return (
    <Formik initialValues={{ name: '' }} onSubmit={() => undefined}>
      {() => (
        <GlassDialog
          open
          onClose={() => onClose()}
          header={<PlainDialogHeader title="Edit details" onClose={onClose} />}
        >
          <Form>
            <TextInput isRequired={false} label="Name" formikField="name" />
            <GlassDialogActions onCancel={onClose} />
          </Form>
        </GlassDialog>
      )}
    </Formik>
  );
}

function FormikBootstrapModal({ onClose }: { onClose: () => void }) {
  return (
    <Formik initialValues={{ name: '' }} onSubmit={() => undefined}>
      {() => (
        <BootstrapModal show onHide={onClose}>
          <BootstrapModal.Header closeButton>
            <BootstrapModal.Title>Edit details</BootstrapModal.Title>
          </BootstrapModal.Header>
          <BootstrapModal.Body>
            <Field name="name" aria-label="Name" />
          </BootstrapModal.Body>
          <BootstrapModal.Footer>
            <GlassDialogActions onCancel={onClose} />
          </BootstrapModal.Footer>
        </BootstrapModal>
      )}
    </Formik>
  );
}

function LocalStateBootstrapModal({
  onClose,
  fieldLabel = 'Reason',
}: {
  onClose: () => void;
  fieldLabel?: string;
}) {
  const [reason, setReason] = useState('');
  return (
    <BootstrapModal show onHide={onClose}>
      <BootstrapModal.Body>
        <input
          aria-label={fieldLabel}
          placeholder={fieldLabel === 'Search' ? 'Search icons' : undefined}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </BootstrapModal.Body>
      <BootstrapModal.Footer>
        <button
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
      </BootstrapModal.Footer>
    </BootstrapModal>
  );
}

function SaveClosesBootstrapModal({ onHide }: { onHide: () => void }) {
  const [show, setShow] = useState(true);
  const [reason, setReason] = useState('');
  return (
    <BootstrapModal show={show} onHide={onHide}>
      <BootstrapModal.Body>
        <input
          aria-label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </BootstrapModal.Body>
      <BootstrapModal.Footer>
        <button type="button" onClick={() => setShow(false)}>Save</button>
      </BootstrapModal.Footer>
    </BootstrapModal>
  );
}

describe('useUnsavedChangesGuard', () => {
  it('confirms a dirty dialog close and preserves edits when dismissed', async () => {
    const onClose = vi.fn();
    renderGuardedForm(true, onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Discard unsaved changes?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Keep Editing/i }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('/form')).toBeTruthy();
  });

  it('discards edits only after confirmation', async () => {
    const onClose = vi.fn();
    renderGuardedForm(true, onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('closes a clean form without showing a confirmation', () => {
    const onClose = vi.fn();
    renderGuardedForm(false, onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByText('Discard unsaved changes?')).toBeNull();
  });

  it.each([
    ['close icon', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['Escape', () => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })],
    ['backdrop', () => fireEvent.click(document.querySelector('.MuiBackdrop-root')!)],
  ])('guards a dirty shared dialog on %s', async (_exitName, attemptExit) => {
    const onClose = vi.fn();
    renderConfigureDialog(true, onClose);

    attemptExit();

    expect(await screen.findByText('Discard unsaved changes?')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('blocks router navigation while dirty until discard is confirmed', async () => {
    const { router } = renderGuardedForm(true);

    fireEvent.click(screen.getByRole('link', { name: 'Navigate' }));
    expect(await screen.findByText('Discard unsaved changes?')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/form');

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/next'));
  });

  it('blocks Formik edits and proceeds after the save resets dirty state', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/form',
          element: (
            <UnsavedChangesProvider>
              <FormikDirtyRoute />
            </UnsavedChangesProvider>
          ),
        },
        { path: '/next', element: <output>Next page</output> },
      ],
      { initialEntries: ['/form'] },
    );
    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('link', { name: 'Navigate' }));
    expect(await screen.findByText('Discard unsaved changes?')).toBeTruthy();

    fireEvent.click(document.querySelector('button[type="button"]')!);
    await waitFor(() => expect(router.state.location.pathname).toBe('/next'));
  });

  it.each([
    ['header close', () => screen.getByRole('button', { name: 'Close' })],
    ['Cancel action', () => screen.getByRole('button', { name: 'Cancel' })],
  ])('guards a dirty GlassDialog on %s', async (_exitName, attemptExit) => {
    const onClose = vi.fn();
    render(<FormikGlassDialog onClose={onClose} />);

    await screen.findByRole('button', {
      name: _exitName === 'header close' ? 'Close' : 'Cancel',
    });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Changed' } });
    fireEvent.click(attemptExit());

    expect(await screen.findByText('Discard unsaved changes?')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('guards a dirty local-state Bootstrap modal on Cancel', async () => {
    const onClose = vi.fn();
    render(<LocalStateBootstrapModal onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('Discard unsaved changes?')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('does not treat search text as an unsaved form edit', () => {
    const onClose = vi.fn();
    render(<LocalStateBootstrapModal onClose={onClose} fieldLabel="Search" />);

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'calendar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByText('Discard unsaved changes?')).toBeNull();
  });

  it('closes a dirty modal after Save without prompting', async () => {
    const onHide = vi.fn();
    render(<SaveClosesBootstrapModal onHide={onHide} />);

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByLabelText('Reason')).toBeNull());
    expect(onHide).not.toHaveBeenCalled();
    expect(screen.queryByText('Discard unsaved changes?')).toBeNull();
  });

  it.each([
    ['header close', () => screen.getByRole('button', { name: 'Close' })],
    ['Cancel action', () => screen.getByRole('button', { name: 'Cancel' })],
  ])('guards a dirty React Bootstrap modal on %s', async (_exitName, getExit) => {
    const onClose = vi.fn();
    render(<FormikBootstrapModal onClose={onClose} />);

    await screen.findByRole('button', {
      name: _exitName === 'header close' ? 'Close' : 'Cancel',
    });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Changed' } });
    fireEvent.click(getExit());

    expect(await screen.findByText('Discard unsaved changes?')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('blocks browser Back while dirty until discard is confirmed', async () => {
    const router = createMemoryRouter(
      [
        { path: '/previous', element: <output>Previous page</output> },
        {
          path: '/form',
          element: (
            <UnsavedChangesProvider>
              <GuardedForm dirty onClose={vi.fn()} />
            </UnsavedChangesProvider>
          ),
        },
      ],
      { initialEntries: ['/previous', '/form'], initialIndex: 1 },
    );
    render(<RouterProvider router={router} />);

    act(() => {
      void router.navigate(-1);
    });

    expect(await screen.findByText('Discard unsaved changes?')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/form');
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/previous'));
  });

  it('navigates immediately when the form is clean', async () => {
    const { router } = renderGuardedForm(false);

    fireEvent.click(screen.getByRole('link', { name: 'Navigate' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/next'));
    expect(screen.queryByText('Discard unsaved changes?')).toBeNull();
  });

  it('installs the browser unload warning only while dirty', () => {
    const dirty = renderGuardedForm(true);
    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
    dirty.unmount();

    const clean = renderGuardedForm(false);
    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);
    clean.unmount();
  });
});
