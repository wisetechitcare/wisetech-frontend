import React, { Suspense } from "react";
import { Dialog, Box } from "@mui/material";
import { BillingLoadingState } from "@pages/billing/components";

/**
 * The document editor and its revision chain, hosted INSIDE the project's
 * Billing tab.
 *
 * Why a dialog rather than a link to /billing/proformas/:id — the Billing module
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

const DocumentEditorPage = React.lazy(() => import("@pages/billing/documents/DocumentEditorPage"));
const ProformaDetailPage = React.lazy(() => import("@pages/billing/proformas/ProformaDetailPage"));

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
    <Dialog
        open={Boolean(target)}
        onClose={onClose}
        fullScreen
        // The document sheet is a full A4 page and the properties panel sits
        // beside it; anything narrower than the viewport makes one of them
        // unusable, which is the whole reason this is fullScreen rather than a
        // large modal.
        PaperProps={{ sx: { bgcolor: "background.default" } }}
    >
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minHeight: "100%" }}>
            {target && (
                <Suspense fallback={<BillingLoadingState rows={6} />}>
                    {target.mode === "edit" ? (
                        <DocumentEditorPage documentId={target.documentId} onBack={onClose} />
                    ) : (
                        <ProformaDetailPage
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
        </Box>
    </Dialog>
);

export default BillDocumentDialog;
