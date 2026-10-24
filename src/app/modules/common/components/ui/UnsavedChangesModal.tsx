import { useContext, useEffect, useId, useState, type ComponentProps } from 'react';
import { FormikContext } from 'formik';
import { Modal as BootstrapModal } from 'react-bootstrap';
import { useUnsavedChangesRegistration } from './UnsavedChangesProvider';
import { useDialogUnsavedChangesBoundary } from './useDialogUnsavedChangesBoundary';
import { DialogCloseContext, DialogDirtyContext } from './UnsavedChangesContext';

export type UnsavedChangesModalProps = ComponentProps<typeof BootstrapModal>;

function ModalDirtyRegistration({
  active,
  modalClassName,
  requestClose,
}: {
  active: boolean;
  modalClassName: string;
  requestClose: () => void;
}) {
  const formik = useContext(FormikContext);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  useEffect(() => {
    if (!active) {
      setHasLocalChanges(false);
      return;
    }
    const markDirty = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(`.${modalClassName}`) &&
        target.matches('input, textarea, select, [contenteditable="true"]') &&
        !target.closest(
          'input[type="search"], [role="search"], [data-unsaved-changes-ignore]',
        ) &&
        !/search|filter/i.test(
          target.getAttribute('aria-label') ??
            target.getAttribute('placeholder') ??
            target.getAttribute('name') ??
            '',
        )
      ) {
        setHasLocalChanges(true);
      }
    };
    const guardClose = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest(
        `.${modalClassName} button, .${modalClassName} [role="button"]`,
      );
      if (!(button instanceof HTMLElement)) return;

      const label = (
        button.getAttribute('aria-label') ??
        button.textContent ??
        ''
      ).trim().toLowerCase();
      if (
        !button.hasAttribute('data-unsaved-changes-close') &&
        label !== 'cancel' &&
        label !== 'close'
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };

    if (!formik) {
      document.addEventListener('input', markDirty, true);
      document.addEventListener('change', markDirty, true);
    }
    document.addEventListener('click', guardClose, true);
    return () => {
      if (!formik) {
        document.removeEventListener('input', markDirty, true);
        document.removeEventListener('change', markDirty, true);
      }
      document.removeEventListener('click', guardClose, true);
    };
  }, [active, formik, modalClassName, requestClose]);

  useUnsavedChangesRegistration(
    active && (formik ? Boolean(formik.dirty) : hasLocalChanges),
  );
  return null;
}

export const UnsavedChangesModal = Object.assign(
  function UnsavedChangesModal({
    onHide,
    ...props
  }: UnsavedChangesModalProps) {
    const modalClassName = `unsaved-changes-modal-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const {
      dirtyContext,
      closeContext,
      requestClose,
      discardDialog,
    } = useDialogUnsavedChangesBoundary();

    return (
      <>
        <DialogDirtyContext.Provider value={dirtyContext}>
          <DialogCloseContext.Provider value={closeContext}>
            <BootstrapModal
              {...props}
              className={[props.className, modalClassName].filter(Boolean).join(' ')}
              onHide={() => requestClose(() => onHide?.())}
            >
              <ModalDirtyRegistration
                active={Boolean(props.show)}
                modalClassName={modalClassName}
                requestClose={() => requestClose(() => onHide?.())}
              />
              {props.children}
            </BootstrapModal>
          </DialogCloseContext.Provider>
        </DialogDirtyContext.Provider>
        {discardDialog}
      </>
    );
  },
  BootstrapModal,
);
