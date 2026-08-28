import React from "react";
import { DialogActions, DialogContent } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton } from "@app/modules/common/components/ui";
import ApprovalStatusTracker from "@pages/approvals/ApprovalStatusTracker";

/**
 * Approval Status for a billing request — the chain, who is holding it, and the audit
 * trail. Nothing else.
 *
 * Kept SEPARATE from the request detail on purpose: "what am I billing" and "where has
 * this got to" are two different questions, and the same split already exists for leave
 * and attendance ("Approval Status" opens its own compact modal). This is the existing
 * `ApprovalStatusTracker` mounted by instance id — no billing-specific approval UI.
 */
const BillingApprovalStatusDialog: React.FC<{
  instanceId: string | null;
  requestNumber?: string;
  onClose: () => void;
}> = ({ instanceId, requestNumber, onClose }) => (
  <GlassDialog
    open={!!instanceId}
    onClose={onClose}
    maxWidth="sm"
    header={
      <GlassHeader
        title={requestNumber ? `Approval Status — ${requestNumber}` : "Approval Status"}
        icon={<KTIcon iconName="check-circle" className="fs-2" />}
        onClose={onClose}
      />
    }
  >
    <DialogContent>
      {instanceId && <ApprovalStatusTracker instanceId={instanceId} showAuditLog />}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <WtButton ghost onClick={onClose}>Close</WtButton>
    </DialogActions>
  </GlassDialog>
);

export default BillingApprovalStatusDialog;
