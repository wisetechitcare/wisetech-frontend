import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtButton, WtField, WtMoneyField } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { useEmployeeLevels } from "@/hooks/useEmployeeLevels";
import { annualAmountError } from "@utils/ctc";
import { getApplicantSources, type ApplicantPayload, type ApplicantSource } from "@services/recruitment";

/**
 * The candidate's own details — ONE form body for adding a candidate (from Candidates or the Pipeline)
 * and for editing one. Two copies are how "New candidate" and "New application" came to ask for
 * different fields and follow different identity rules.
 *
 * Controlled: the parent owns the values and decides what Save does.
 */

/** Blank candidate. The API requires a first name plus EITHER an email or a phone. */
export const emptyCandidate = (): ApplicantPayload => ({
    firstName: "", lastName: "", email: "", phone: "",
    currentEmployer: "", currentTitle: "", currentLocation: "", qualification: "", employeeLevelId: null,
    totalExperienceMonths: null, currentCtc: null,
    expectedCtc: null, noticePeriodDays: null, sourceId: null,
});

/** Email OR phone — the rule the server enforces. Walk-in, WhatsApp and referral candidates often have only a number. */
export const hasCandidateIdentity = (form: ApplicantPayload) => Boolean((form.email ?? "").trim() || (form.phone ?? "").trim());

/** Every reason Save must wait, so the button can never send what the API refuses. */
export const candidateFormProblems = (form: ApplicantPayload) => ({
    firstName: !form.firstName.trim(),
    identity: !hasCandidateIdentity(form),
    currentCtc: annualAmountError("Current salary", form.currentCtc),
    expectedCtc: annualAmountError("Expected salary", form.expectedCtc),
});
export const isCandidateFormValid = (form: ApplicantPayload) => {
    const p = candidateFormProblems(form);
    return !p.firstName && !p.identity && !p.currentCtc && !p.expectedCtc;
};

interface Props {
    form: ApplicantPayload;
    onChange: (next: ApplicantPayload) => void;
    /** Show "required" messages — after a save was attempted, not while the form is still blank. */
    showErrors: boolean;
    resumeFile: File | null;
    onResumeFile: (file: File | null) => void;
    /** The stored resume's name, when editing someone who has one. */
    existingResumeName?: string | null;
    disabled?: boolean;
}

export function CandidateFormFields({ form, onChange, showErrors, resumeFile, onResumeFile, existingResumeName, disabled }: Props) {
    const { levels, isEmpty: noLevels } = useEmployeeLevels();
    const { data: sources = [] } = useQuery({ queryKey: queryKeys.recruitment.applicantSources(), queryFn: getApplicantSources });
    const fileRef = useRef<HTMLInputElement | null>(null);

    const problems = candidateFormProblems(form);
    const set = <K extends keyof ApplicantPayload>(key: K, value: ApplicantPayload[K]) => onChange({ ...form, [key]: value });
    /** "" must become null, not 0 — 0 years' experience is a real value. */
    const setNum = (key: "totalExperienceMonths" | "noticePeriodDays", raw: string) => set(key, raw === "" ? null : Number(raw));
    const identityError = showErrors && problems.identity ? "Enter an email or a phone number." : undefined;

    return (
        <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <WtField label="First name" required sx={{ flex: 1 }} value={form.firstName} onChange={(v) => set("firstName", v)}
                    error={showErrors && problems.firstName ? "First name is required" : undefined} disabled={disabled} />
                <WtField label="Last name" sx={{ flex: 1 }} value={form.lastName ?? ""} onChange={(v) => set("lastName", v)} disabled={disabled} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <WtField label="Email" type="email" inputMode="email" sx={{ flex: 1 }} value={form.email ?? ""} onChange={(v) => set("email", v)}
                    error={identityError} hint="Email or phone — either one is enough." disabled={disabled} />
                <WtField label="Phone" type="tel" inputMode="tel" sx={{ flex: 1 }} value={form.phone ?? ""} onChange={(v) => set("phone", v)}
                    error={identityError} disabled={disabled} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <WtField label="Current title" sx={{ flex: 1 }} value={form.currentTitle ?? ""} onChange={(v) => set("currentTitle", v)} disabled={disabled} />
                <WtField label="Current employer" sx={{ flex: 1 }} value={form.currentEmployer ?? ""} onChange={(v) => set("currentEmployer", v)} disabled={disabled} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <WtField label="Current location" sx={{ flex: 1 }} value={form.currentLocation ?? ""} onChange={(v) => set("currentLocation", v)} disabled={disabled} />
                <WtField label="Qualification" sx={{ flex: 1 }} value={form.qualification ?? ""} onChange={(v) => set("qualification", v)} disabled={disabled} />
            </Stack>
            {/* Two per row: four money and number fields crushed into one row made their labels and hints unreadable. */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <WtMoneyField label="Current salary" per="year" hint="Full yearly amount" sx={{ flex: 1 }}
                    value={form.currentCtc} onChange={(v) => set("currentCtc", v)} error={problems.currentCtc} disabled={disabled} />
                <WtMoneyField label="Expected salary" per="year" hint="Full yearly amount" sx={{ flex: 1 }}
                    value={form.expectedCtc} onChange={(v) => set("expectedCtc", v)} error={problems.expectedCtc} disabled={disabled} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <WtField label="Experience" type="number" min={0} inputMode="numeric" hint="In months" sx={{ flex: 1 }}
                    value={form.totalExperienceMonths ?? ""} onChange={(v) => setNum("totalExperienceMonths", v)} disabled={disabled} />
                <WtField label="Notice period" type="number" min={0} inputMode="numeric" hint="In days" sx={{ flex: 1 }}
                    value={form.noticePeriodDays ?? ""} onChange={(v) => setNum("noticePeriodDays", v)} disabled={disabled} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                {/* Same ladder the requisition picks from — a level comparison only means something if both chose from one list. */}
                {!noLevels && (
                    <WtField label="Seniority" sx={{ flex: 1 }} clearable value={form.employeeLevelId ?? ""}
                        onChange={(v) => set("employeeLevelId", v || null)}
                        options={levels.map((l) => ({ value: l.id, label: l.name }))} placeholder="Not set" disabled={disabled} />
                )}
                <WtField label="Where they came from" sx={{ flex: 1 }} clearable value={form.sourceId ?? ""}
                    onChange={(v) => set("sourceId", v || null)}
                    options={sources.map((s: ApplicantSource) => ({ value: s.id, label: s.name }))}
                    placeholder="Not recorded" hint="Tells you which channel is worth the budget." disabled={disabled} />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,application/pdf" hidden
                    onChange={(e) => onResumeFile(e.target.files?.[0] ?? null)} />
                <WtButton ghost size="small" disabled={disabled} startIcon={<KTIcon iconName="cloud-add" className="fs-5" />}
                    onClick={() => { if (fileRef.current) fileRef.current.value = ""; fileRef.current?.click(); }}>
                    {resumeFile ? "Choose a different resume" : existingResumeName ? "Replace resume" : "Attach resume"}
                </WtButton>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", minWidth: 0, flex: 1 }} noWrap>
                    {resumeFile?.name ?? existingResumeName ?? "PDF, DOC or DOCX"}
                </Typography>
            </Stack>
        </Stack>
    );
}

export default CandidateFormFields;
