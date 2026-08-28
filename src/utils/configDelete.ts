import { deleteConfirmation, errorConfirmation, successConfirmation } from '@utils/modal';
import { apiErrorMessage } from '@utils/apiError';

/**
 * Confirm → delete → announce, in that ORDER, with an in-use refusal surfaced.
 *
 * The **standard delete handler for any configuration list** (Employees → Configure,
 * Organization → Configure, masters screens). Drop it in place of a hand-rolled
 * try/catch and the screen gets the right behaviour for free:
 *
 *   onDelete={(id) => confirmAndDelete({
 *     label: 'department',
 *     remove: () => archiveDepartmentById(id),
 *     refresh: fetchDepartments,
 *   })}
 *
 * ── Why this exists rather than eight copies of the same eight lines ──
 *
 * Every copy carried the same two bugs, and the copies had already drifted — two of
 * them surfaced their errors, five swallowed them into `console.error`:
 *
 *  1. `deleteConfirmation(message)` fires its success dialog the INSTANT you press
 *     Delete — before the request is sent — then returns true. So the message was
 *     never about the outcome. Passing `announce: false` and calling
 *     `successConfirmation` after the await is what makes it mean something.
 *  2. A server that REFUSED the delete was indistinguishable from success: the dialog
 *     said deleted, the row stayed, and the reason went to a console nobody reads.
 *
 * ── Why the "is it in use?" check is NOT here ──
 *
 * It belongs on the server (`utils/inUseGuard` there); this function's job is to show
 * that refusal well. A client cannot know every table pointing at a row — a job
 * profile is referenced by employees, job requisitions AND scorecard templates — and
 * a client-side check is advisory anyway: two admins with the screen open, one
 * assigns the last employee while the other presses Delete. A second copy of the rule
 * here would only be one more thing to drift.
 */
export interface ConfirmAndDeleteOptions {
    /** Singular, lower case: "department", "job profile". Used in every message. */
    label: string;
    /** Performs the delete. Reject to signal failure. */
    remove: () => Promise<unknown>;
    /** Reload the list once the delete lands. */
    refresh: () => void;
    /** Say "archived" where the row is retired rather than removed. */
    action?: 'deleted' | 'archived';
}

export const confirmAndDelete = async ({
    label,
    remove,
    refresh,
    action = 'deleted',
}: ConfirmAndDeleteOptions): Promise<void> => {
    const confirmed = await deleteConfirmation('', 'Delete', 'Deleted', false);
    if (!confirmed) return;

    try {
        await remove();
        await successConfirmation(`Successfully ${action} ${label}`);
        refresh();
    } catch (error: any) {
        console.error(`Error deleting ${label}:`, error);
        // The server's own sentence names WHY — "used by 3 employees and 1 job
        // requisition" — which is the only useful thing to put on screen. It lives in
        // `detail`; `.message` is the HTTP status name, which is how this dialog was
        // showing a bare "Bad request". The fallback is for a network failure, where
        // there is no sentence to show.
        await errorConfirmation(
            apiErrorMessage(error, `Could not delete this ${label}. Please try again.`),
            'Could not delete',
        );
    }
};

export default confirmAndDelete;
