import { DialogContent } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader } from "@app/modules/common/components/ui";
import { VersionHistory } from "@modules/audit/VersionHistory";
import type { AuditEntityType } from "@modules/audit/audit.service";

interface Props {
    open: boolean;
    onClose: () => void;
    type: AuditEntityType;
    id: string;
    title?: string;
    /** Admins see unmasked sensitive values + Reset. Default false (matches LeadOverview). */
    isAdmin?: boolean;
}

/**
 * Per-record Change Intelligence timeline for recruitment entities.
 * Reuses the shared VersionHistory surface (same as Lead overview).
 */
export default function RecruitmentVersionHistoryDialog({
    open,
    onClose,
    type,
    id,
    title = "Version History",
    isAdmin = false,
}: Props) {
    return (
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            header={
                <GlassHeader
                    title={title}
                    icon={<KTIcon iconName="time" className="fs-2" />}
                    onClose={onClose}
                />
            }
        >
            <DialogContent>
                {id ? <VersionHistory type={type} id={id} isAdmin={isAdmin} /> : null}
            </DialogContent>
        </GlassDialog>
    );
}
