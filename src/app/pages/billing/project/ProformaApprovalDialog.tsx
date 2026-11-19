import React, { useState } from "react";
import { CircleHelp } from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from "@/ds/ui/alert-dialog";
import { toast } from "@app/modules/common/components/ui";
import { setVersionStatus } from "@services/billingDocuments";
import type { ProjectBillingRow } from "@services/bills";

type LiveBill = NonNullable<ProjectBillingRow["bill"]>;

export interface ApprovalRequest {
    /** The bills whose proforma is still pending with the client. */
    bills: LiveBill[];
    /** What is about to happen, in words: "record a payment", "raise the bill". */
    action: string;
    /** Runs once every proforma is marked approved. */
    run: () => void;
}

const STATUS_WORD: Record<string, string> = { GENERATED: "published, not yet sent", SENT: "sent", VIEWED: "viewed" };

/**
 * "Has the client approved the proforma?" — asked before money is recorded or a tax invoice raised against a proforma
 * the client has not answered yet.
 *
 * Yes RECORDS the approval (the version becomes Client Accepted) and then continues, so the document trail says what
 * the person just told us. A proforma never marked sent is marked Sent first: the server only accepts approval of
 * something the client received. Not yet cancels and changes nothing.
 */
const ProformaApprovalDialog: React.FC<{
    request: ApprovalRequest | null;
    onClose: () => void;
    /** After the statuses change — the tab re-reads the bills. */
    onApproved: () => void;
}> = ({ request, onClose, onApproved }) => {
    const [saving, setSaving] = useState(false);
    const bills = request?.bills ?? [];
    const one = bills.length === 1 ? bills[0] : null;

    const approve = async () => {
        if (!request) return;
        setSaving(true);
        try {
            for (const bill of request.bills) {
                if (!bill.proformaDocumentId || !bill.proformaVersionId) continue;
                if (bill.proformaVersionStatus === "GENERATED") {
                    await setVersionStatus(bill.proformaDocumentId, bill.proformaVersionId, "SENT");
                }
                await setVersionStatus(bill.proformaDocumentId, bill.proformaVersionId, "CLIENT_ACCEPTED");
            }
            onApproved();
            onClose();
            request.run();
        } catch (error: any) {
            toast({
                icon: "error",
                title: "Could not mark the proforma approved",
                text: error?.response?.data?.message ?? "Nothing was changed. Please try again.",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <AlertDialog open={!!request} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia><CircleHelp /></AlertDialogMedia>
                    <AlertDialogTitle>
                        {one ? "Has the client approved this proforma?" : "Has the client approved these proformas?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {one ? (
                            <>
                                <strong className="text-foreground">{one.proformaNumber ?? "The proforma"}</strong> is{" "}
                                {STATUS_WORD[one.proformaVersionStatus ?? ""] ?? "pending"} — the client has not approved it yet.
                            </>
                        ) : (
                            <>
                                {bills.map((b) => b.proformaNumber ?? b.billNumber).join(", ")} are not approved by the client yet.
                            </>
                        )}{" "}
                        To {request?.action}, it must be approved. Confirm only if the client has accepted it.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={saving}>Not yet</AlertDialogCancel>
                    <AlertDialogAction loading={saving} onClick={approve}>
                        Yes, approved — continue
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ProformaApprovalDialog;
