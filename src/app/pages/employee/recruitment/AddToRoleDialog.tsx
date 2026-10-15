import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DialogContent, Stack, Typography } from "@mui/material";
import {
  FORM_SPACE, GlassDialog, GlassDialogActions, GlassHeader, InlineNotice, WtField, toast,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import { createApplication, getApplications, getRequisitions, type JobRequisition } from "@services/recruitment";
import { isRoleOpenForCandidates, SEARCHABLE_FROM } from "@utils/requisitions";

/**
 * Put someone already on file into a role.
 *
 * Roles they are already in are left out of the list; the server refuses a duplicate either way.
 * Blacklisted candidates are refused by the API (CANDIDATE_BLACKLISTED).
 */
interface Props {
    open: boolean;
    onClose: () => void;
    applicantId: string;
    applicantName: string;
    companyId?: string;
    onAdded?: () => void;
}

export function AddToRoleDialog({ open, onClose, applicantId, applicantName, companyId, onAdded }: Props) {
    const qc = useQueryClient();
    const [requisitionId, setRequisitionId] = useState("");
    useEffect(() => { if (open) setRequisitionId(""); }, [open]);

    const { data: requisitions = [], isLoading: rolesLoading } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(companyId),
        queryFn: () => getRequisitions(companyId),
        enabled: open,
    });
    const { data: theirApplicationPage, isLoading: appsLoading } = useQuery({
        queryKey: queryKeys.recruitment.applications({ applicantId }),
        queryFn: () => getApplications({ applicantId }),
        enabled: open,
    });
    const theirApplications = theirApplicationPage?.items ?? [];

    const alreadyIn = useMemo(() => new Set(theirApplications.map((a) => a.requisitionId).filter(Boolean) as string[]), [theirApplications]);
    const available = useMemo(
        () => requisitions.filter((r: JobRequisition) => isRoleOpenForCandidates(r) && !alreadyIn.has(r.id)),
        [requisitions, alreadyIn],
    );
    const loading = rolesLoading || appsLoading;
    const role = available.find((r) => r.id === requisitionId);

    const addMut = useMutation({
        mutationFn: () => createApplication({ applicantId, requisitionId }, companyId),
        onSuccess: () => {
            toast({ icon: "success", title: `${applicantName} added to "${role?.title ?? "the role"}"` });
            qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
            onAdded?.();
            onClose();
        },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not add them to the role") }),
    });

    return (
        <GlassDialog
            open={open}
            onClose={addMut.isPending ? undefined : onClose}
            maxWidth="xs"
            preset="form"
            header={
                <GlassHeader
                    title="Add to a Role"
                    subtitle={applicantName}
                    icon="briefcase"
                    onClose={addMut.isPending ? undefined : onClose}
                />
            }
        >
            <DialogContent sx={{ p: FORM_SPACE.bodyPad }}>
                <Stack spacing={FORM_SPACE.fieldGap}>
                    {!loading && available.length === 0 && (
                        <InlineNotice icon="information-5">
                            No approved roles with open seats left to add them to.
                        </InlineNotice>
                    )}
                    <WtField
                        label="Role" required fullWidth
                        value={requisitionId} onChange={setRequisitionId}
                        options={available.map((r) => ({ value: r.id, label: r.prefix ? `${r.prefix} · ${r.title}` : r.title }))}
                        searchable={available.length >= SEARCHABLE_FROM}
                        placeholder={loading ? "Loading roles…" : available.length ? "Choose an approved role" : "No roles left to add them to"}
                        disabled={loading || addMut.isPending || !available.length}
                        hint="Approved, open roles they are not already in."
                    />
                    {alreadyIn.size > 0 && (
                        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                            Already in {alreadyIn.size === 1 ? "1 role" : `${alreadyIn.size} roles`}.
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <GlassDialogActions
                onCancel={onClose}
                cancelDisabled={addMut.isPending}
                onSubmit={() => addMut.mutate()}
                submitDisabled={!requisitionId || addMut.isPending}
                submitting={addMut.isPending}
                submitLabel="Add to Role"
            />
        </GlassDialog>
    );
}

export default AddToRoleDialog;
