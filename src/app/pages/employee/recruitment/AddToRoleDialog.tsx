import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton, WtField, toast } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import { createApplication, getApplications, getRequisitions, type JobRequisition } from "@services/recruitment";

/**
 * Put someone already on file into a role.
 *
 * Before this there was no way to: a candidate added to the pool could reach a pipeline only by
 * retyping their email or phone into "New application". Roles they are already in are left out of
 * the list, and the server refuses a duplicate either way.
 */
interface Props {
    open: boolean;
    onClose: () => void;
    applicantId: string;
    applicantName: string;
    companyId?: string;
    onAdded?: () => void;
}

const SEARCHABLE_FROM = 8;

export function AddToRoleDialog({ open, onClose, applicantId, applicantName, companyId, onAdded }: Props) {
    const qc = useQueryClient();
    const [requisitionId, setRequisitionId] = useState("");
    useEffect(() => { if (open) setRequisitionId(""); }, [open]);

    const { data: requisitions = [], isLoading: rolesLoading } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(companyId),
        queryFn: () => getRequisitions(companyId),
        enabled: open,
    });
    const { data: theirApplications = [], isLoading: appsLoading } = useQuery({
        queryKey: queryKeys.recruitment.applications({ applicantId }),
        queryFn: () => getApplications({ applicantId }),
        enabled: open,
    });

    const alreadyIn = useMemo(() => new Set(theirApplications.map((a) => a.requisitionId).filter(Boolean) as string[]), [theirApplications]);
    const available = useMemo(
        () => requisitions.filter((r: JobRequisition) => r.status === 1 && r.isActive !== false && !alreadyIn.has(r.id)),
        [requisitions, alreadyIn],
    );
    const loading = rolesLoading || appsLoading;
    const role = available.find((r) => r.id === requisitionId);

    const addMut = useMutation({
        mutationFn: () => createApplication({ applicantId, requisitionId }),
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
            header={
                <GlassHeader
                    title="Add to a role"
                    subtitle={applicantName}
                    icon={<KTIcon iconName="briefcase" className="fs-2" />}
                    onClose={addMut.isPending ? undefined : onClose}
                />
            }
        >
            <DialogContent>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
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
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <WtButton ghost onClick={onClose} disabled={addMut.isPending}>Cancel</WtButton>
                <WtButton tone="primary" onClick={() => addMut.mutate()} disabled={!requisitionId || addMut.isPending}>
                    {addMut.isPending ? "Adding…" : "Add to role"}
                </WtButton>
            </DialogActions>
        </GlassDialog>
    );
}

export default AddToRoleDialog;
