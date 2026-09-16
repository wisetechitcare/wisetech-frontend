import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DialogActions, DialogContent, Stack } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton, WtField, toast } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import {
    createApplicant, createApplication, getRequisitions, uploadApplicantResume,
    type ApplicantPayload, type JobRequisition,
} from "@services/recruitment";
import { CandidateFormFields, emptyCandidate, isCandidateFormValid } from "./CandidateFormFields";
import { cleanCandidatePayload } from "./candidatePayload";

/**
 * Add a candidate — the ONE window, from the Candidates directory and from the Pipeline.
 *
 * It replaces "New candidate" and "New application", which were two names for one idea with different
 * fields and different identity rules. The difference is only the Role:
 *   - with a role, the person is put into that role's pipeline (someone already on file is attached, and
 *     only their empty fields are filled — their record is never overwritten);
 *   - without one, they join the talent pool (someone already on file is refused and named, so they are
 *     found rather than duplicated).
 * From the Pipeline a role is required, because a board card with no role has no column to sit in.
 */
interface Props {
    open: boolean;
    onClose: () => void;
    /** Pipeline: yes. Candidates directory: no — a candidate can join the pool without a role. */
    roleRequired?: boolean;
    /** Scope of the role list — the shell's organization filter. */
    companyId?: string;
    onAdded?: () => void;
}

/** Past this many options a plain menu becomes a scroll hunt. */
const SEARCHABLE_FROM = 8;

export function AddCandidateDialog({ open, onClose, roleRequired = false, companyId, onAdded }: Props) {
    const qc = useQueryClient();
    const [form, setForm] = useState<ApplicantPayload>(emptyCandidate());
    const [requisitionId, setRequisitionId] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [attempted, setAttempted] = useState(false);

    // Every open starts blank: a cancelled draft never reappears.
    useEffect(() => {
        if (!open) return;
        setForm(emptyCandidate());
        setRequisitionId("");
        setResumeFile(null);
        setAttempted(false);
    }, [open]);

    const { data: requisitions = [], isLoading: rolesLoading } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(companyId),
        queryFn: () => getRequisitions(companyId),
        enabled: open,
    });
    // Approved and still open: a draft or rejected role has no pipeline to put anyone in.
    const openRoles = useMemo(() => requisitions.filter((r: JobRequisition) => r.status === 1 && r.isActive !== false), [requisitions]);
    const role = openRoles.find((r) => r.id === requisitionId);

    const valid = isCandidateFormValid(form) && (!roleRequired || !!requisitionId);

    const addMut = useMutation({
        mutationFn: async () => {
            const payload = cleanCandidatePayload(form);
            let applicantId: string | undefined;
            let existed = false;
            if (requisitionId) {
                const res = await createApplication({ applicant: payload, requisitionId });
                applicantId = res?.application?.applicantId;
                existed = Boolean(res?.application?.applicantExisted);
            } else {
                const res = await createApplicant(payload);
                applicantId = res?.applicant?.id;
            }
            // The resume goes up once the candidate exists. Its failure is reported in the SAME toast as
            // the save — a success toast shown right after an error toast replaced it before anyone read it.
            let resumeError: string | null = null;
            if (resumeFile && applicantId) {
                try { await uploadApplicantResume(applicantId, resumeFile); } catch (err) { resumeError = apiErrorMessage(err, "the file was refused"); }
            }
            return { existed, resumeError };
        },
        onSuccess: ({ existed, resumeError }) => {
            const name = [form.firstName.trim(), (form.lastName ?? "").trim()].filter(Boolean).join(" ");
            const where = role ? ` to "${role.title}"` : "";
            const title = existed
                ? `${name} was already on file — added their existing record${where}`
                : `${name} added${where}`;
            toast(resumeError
                ? { icon: "warning", title: `${title}, but the resume did not upload: ${resumeError}` }
                : { icon: "success", title });
            qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
            onAdded?.();
            onClose();
        },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not add the candidate") }),
    });

    const save = () => {
        setAttempted(true);
        if (valid && !addMut.isPending) addMut.mutate();
    };

    return (
        <GlassDialog
            open={open}
            onClose={addMut.isPending ? undefined : onClose}
            maxWidth="sm"
            header={
                <GlassHeader
                    title="Add candidate"
                    subtitle={roleRequired ? "Add someone to a role's pipeline" : "Add someone to the candidate pool, or straight into a role"}
                    icon={<KTIcon iconName="user-tick" className="fs-2" />}
                    onClose={addMut.isPending ? undefined : onClose}
                />
            }
        >
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <WtField
                        label="Role" required={roleRequired} fullWidth clearable
                        value={requisitionId} onChange={setRequisitionId}
                        options={openRoles.map((r) => ({ value: r.id, label: r.prefix ? `${r.prefix} · ${r.title}` : r.title }))}
                        searchable={openRoles.length >= SEARCHABLE_FROM}
                        placeholder={rolesLoading ? "Loading roles…" : openRoles.length ? "Choose an approved role" : "No approved roles yet"}
                        disabled={addMut.isPending || rolesLoading}
                        error={attempted && roleRequired && !requisitionId ? "Choose the role they are applying for" : undefined}
                        hint={roleRequired
                            ? "Only approved, open roles are listed."
                            : "Optional. With a role they go straight onto its pipeline; without one they join the candidate pool."}
                    />
                    <CandidateFormFields
                        form={form}
                        onChange={setForm}
                        showErrors={attempted}
                        resumeFile={resumeFile}
                        onResumeFile={setResumeFile}
                        disabled={addMut.isPending}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <WtButton ghost onClick={onClose} disabled={addMut.isPending}>Cancel</WtButton>
                <WtButton tone="primary" onClick={save} disabled={addMut.isPending || (attempted && !valid)}>
                    {addMut.isPending ? "Adding…" : role ? "Add to role" : "Add candidate"}
                </WtButton>
            </DialogActions>
        </GlassDialog>
    );
}

export default AddCandidateDialog;
