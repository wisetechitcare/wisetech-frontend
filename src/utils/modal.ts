import {
    showDialog,
    type DialogResult,
} from '@app/modules/common/components/ui/dialogStore';
import { escapeHtml } from '@app/modules/common/components/ui/safeHtml';

/**
 * Legacy confirmation helpers — same names, signatures and return values as before, now
 * rendered by the kit ConfirmDialog through the dialog service. Functions that used to return
 * `Swal.fire(...)` return its successor, `DialogResult` (the same `isConfirmed` / `isDenied` /
 * `isDismissed` / `dismiss` fields).
 *
 * The dialog service stacks itself above MUI dialogs and react-bootstrap modals, so a
 * confirmation fired from inside an open dialog is reachable (the old `.swal2-container`
 * z-index patch is no longer needed).
 */

export type { DialogResult };

// Default titles match the kit's ConfirmDialog variant defaults. A caller that knows the outcome
// should name it instead ("Checked In", "Leave Approved") — see wisetech-backend/docs/MESSAGE_STYLE.md.
export const successConfirmation = (message: string, title: string = 'Done'): Promise<DialogResult> => {
    return showDialog({
        variant: 'success',
        title,
        message,
        confirmLabel: 'OK',
        showCancel: false,
    });
};

export const errorConfirmation = (message: string, title: string = "That Didn't Work"): Promise<DialogResult> => {
    const isHtml = /<[a-z][\s\S]*>/i.test(message || '');
    // Markup from the caller is sanitised by the dialog service. Plain text is escaped first so
    // it can never become markup, then its line breaks are kept.
    const formattedMessage = isHtml
        ? message
        : message
            ? escapeHtml(message).replace(/\n/g, '<br>')
            : 'Something went wrong on our side. Try again.';

    return showDialog({
        variant: 'error',
        title,
        html: formattedMessage,
        confirmLabel: 'Close',
        showCancel: false,
    });
};

/**
 * Confirms a deletion.
 *
 * NOTE: by default this shows the success message as soon as the user confirms — BEFORE the
 * caller has actually deleted anything, so a delete that then fails still reports success.
 * Pass `announce: false` to suppress it and report the real outcome yourself.
 *
 * The default is unchanged because 44 call sites rely on it; each should move to
 * `announce: false` as it gains real error handling.
 */
// `swalFireTitle` is unused (it always was) — kept so positional callers still line up.
export const deleteConfirmation = async (message: string, confirmButtonText: string = "Delete", swalFireTitle: string = "Deleted", announce: boolean = true) => {
    void swalFireTitle;
    const result = await showDialog({
        variant: 'delete',
        title: 'Confirm Deletion',
        message: 'Are you sure you want to delete this record? This action cannot be undone.',
        confirmLabel: confirmButtonText,
        cancelLabel: 'Cancel',
    });

    if (result.isConfirmed) {
        if (announce) await successConfirmation(message);
        return true;
    }
    return false;
};

export const removeConfirmation = async (message: string, confirmButtonText: string = "Remove", swalFireTitle: string = "Removed") => {
    void swalFireTitle;
    const result = await showDialog({
        variant: 'delete',
        title: 'Confirm Removal',
        message: 'Are you sure you want to remove this entry?',
        confirmLabel: confirmButtonText,
        cancelLabel: 'Cancel',
    });

    if (result.isConfirmed) {
        await successConfirmation(message);
        return true;
    }
    return false;
};

export const genericConfirmation = async (title: string, text: string, confirmButtonText: string = 'Confirm', icon: 'warning' | 'info' | 'question' = 'warning'): Promise<boolean> => {
    const result = await showDialog({
        variant: icon === 'warning' ? 'warning' : 'info',
        title,
        message: text,
        confirmLabel: confirmButtonText,
        cancelLabel: 'Cancel',
        danger: true,
    });

    return result.isConfirmed;
};

export const rejectConfirmation = async (confirmButtonText: string = 'Reject'): Promise<boolean> => {
    const result = await showDialog({
        variant: 'warning',
        title: 'Confirm Rejection',
        message: 'Are you sure you want to reject this request?',
        confirmLabel: confirmButtonText,
        cancelLabel: 'Cancel',
        danger: true,
    });

    return result.isConfirmed;
};

export type LeadUpdateMode = 'revision' | 'updateOnly' | 'cancelled';

export const customConfirmation = async (confirmButtonText: string = 'Save Revision', cancelButtonText: string = 'Update Only'): Promise<LeadUpdateMode> => {
    const result = await showDialog({
        variant: 'confirm',
        title: 'Update Lead Information',
        html:
            '<p>You are about to save changes to this lead. Choose how you would like to handle this update:</p>'
            + '<ul>'
            + '<li><strong>Save Revision:</strong> Increments version number and creates a history record.</li>'
            + '<li><strong>Update Only:</strong> Modifies the current record without version tracking.</li>'
            + '</ul>',
        confirmLabel: confirmButtonText,
        // "Update Only" is its own button. Cancel, the corner X, a backdrop click and Escape
        // are all a real abort — never a silent "update only" choice.
        denyLabel: cancelButtonText,
        cancelLabel: 'Cancel',
    });

    if (result.isConfirmed) return 'revision';
    if (result.isDenied) return 'updateOnly';
    return 'cancelled';
};

export const warningNotification = (message: string, title: string = "Notification"): Promise<DialogResult> => {
    return showDialog({
        variant: 'info',
        title,
        message,
        confirmLabel: 'Acknowledge',
        showCancel: false,
    });
};

/**
 * Enhanced Aliases that support (title, message) OR just (message)
 */
export const showError = (titleOrMessage: string, message?: string) => {
    if (message) {
        return errorConfirmation(message, titleOrMessage);
    }
    return errorConfirmation(titleOrMessage);
};

export const showSuccess = (titleOrMessage: string, message?: string) => {
    if (message) {
        return successConfirmation(message, titleOrMessage);
    }
    return successConfirmation(titleOrMessage);
};

export const showWarning = (titleOrMessage: string, message?: string) => {
    if (message) {
        return warningNotification(message, titleOrMessage);
    }
    return warningNotification(titleOrMessage);
};
