import React, { Suspense } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/ds/ui/dialog";
import { BillingLoadingState } from "@pages/billing/components";

/**
 * The document editor and its revision chain, hosted INSIDE the project's
 * Billing tab.
 *
 * Why a dialog rather than a link to /billing/documents/:id — the Billing module
 * is organised for finance: every screen in it spans all projects, and its routes
 * are gated on `billing.proformas`, which a project manager raising a bill on
 * their own project does not necessarily hold. Sending them there either bounces
 * them to the Tracker or drops them into a module-wide list they then have to
 * filter back down to one project. One project's paperwork is small enough to
 * handle in place, so it is handled in place.
 *
 * The two pages are REUSED, not reimplemented. They already own saving, the
 * required-field policy, publishing, the PDF, the version chain, compare and
 * email; both simply take `documentId` and `onBack` instead of reading the route.
 *
 * Lazily imported because the editor pulls in the whole document sheet renderer,
 * which no project needs until someone actually opens a bill.
 */

const BillDocumentEditorPage = React.lazy(() => import("@pages/billing/documents/BillDocumentEditorPage"));
const DocumentDetailPage = React.lazy(() => import("@pages/billing/documents/DocumentDetailPage"));

export type BillDocumentMode = "edit" | "manage";

export interface BillDocumentTarget {
    documentId: string;
    /** `edit` opens the editor on a draft; `manage` opens the revision chain. */
    mode: BillDocumentMode;
}

const BillDocumentDialog: React.FC<{
    target: BillDocumentTarget | null;
    onClose: () => void;
    onModeChange: (target: BillDocumentTarget) => void;
}> = ({ target, onClose, onModeChange }) => (
    <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open) onClose(); }}>
        {/* The document sheet is a full A4 page and the properties panel sits beside it; anything
            narrower than the viewport makes one of them unusable, which is the whole reason this
            fills the screen rather than being a large modal. The kit Dialog has no `fullScreen`
            prop — it is sized through className, so the centred max-w-md popup is overridden here.
            No close button: both pages inside own the Back control, as they did under MUI. */}
        <DialogContent
            showCloseButton={false}
            className="h-full max-h-none w-full max-w-none gap-0 overflow-auto rounded-none bg-background p-0 ring-0 sm:max-w-none"
        >
        {/* The dialog still needs an accessible name; the pages inside carry their own visible
            headings, so this one is for assistive tech only. MUI's Dialog had none at all. */}
        <DialogTitle className="sr-only">Bill Document</DialogTitle>
        <div className="min-h-full p-3 sm:p-5">
            {target && (
                <Suspense fallback={<BillingLoadingState rows={6} />}>
                    {target.mode === "edit" ? (
                        <BillDocumentEditorPage
                            documentId={target.documentId}
                            onBack={onClose}
                            // Published: the same dialog swaps to the document's own page (versions, PDF, email).
                            onPublished={(documentId) => onModeChange({ documentId, mode: "manage" })}
                        />
                    ) : (
                        <DocumentDetailPage
                            documentId={target.documentId}
                            onBack={onClose}
                            // Revising a published document opens a fresh draft —
                            // stay in the dialog and swap to the editor rather than
                            // routing out of the project.
                            onEdit={(documentId) => onModeChange({ documentId, mode: "edit" })}
                        />
                    )}
                </Suspense>
            )}
        </div>
        </DialogContent>
    </Dialog>
);

export default BillDocumentDialog;
