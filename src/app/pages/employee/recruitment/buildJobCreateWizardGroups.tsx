import { useEffect } from "react";
import { useFormikContext } from "formik";
import { useQuery } from "@tanstack/react-query";
import { Box, Typography } from "@mui/material";
import {
    WorkOutlineOutlined,
    CampaignOutlined,
    QuizOutlined,
} from "@mui/icons-material";
import { FormSection, TRIO, FORM_SPACE, WtField } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { getRequisitionById } from "@services/recruitment";
import { SEARCHABLE_FROM } from "@utils/requisitions";
import type { OnboardingGroup } from "../forms/onboarding/OnboardingWizard";
import type { OnboardingSectionsProps } from "../forms/onboarding/OnboardingSections";
import { RequisitionFormFields } from "./RequisitionFormFields";
import { PostingFormFields, type PostingRoleOption } from "./PostingFormFields";
import { ApplyFormConfigBuilder } from "./ApplyFormConfigBuilder";
import {
    jobCreateValuesFromEntities,
    roleSectionComplete,
    type JobCreateFormValues,
} from "./jobCreateFormValues";

export interface BuildJobCreateArgs {
    companyId?: string;
    bandCurrency?: string | null;
    branchUsable?: boolean;
    levels?: ReadonlyArray<{ id: string; name: string }>;
    hideLevels?: boolean;
    stages?: ReadonlyArray<{ id: string; name: string }>;
    disabled?: boolean;
    /** Role fields locked (approval pending / read-only permission). */
    roleDisabled?: boolean;
    rejectedNotice?: boolean;
    /**
     * New Advert on an existing open role — Role step is a picker, submit creates
     * a posting only (same Advert + Screening leaves as Create/Edit Role).
     */
    attachMode?: boolean;
    roleOptions?: PostingRoleOption[];
    rolesLoading?: boolean;
}

/** Prefill public description from role JD once (no AI). */
function AdvertDescriptionPrefill() {
    const { values, setFieldValue } = useFormikContext<JobCreateFormValues>();
    useEffect(() => {
        if (values.descriptionPrefillDone) return;
        const jd = (values.role?.jobDescription ?? "").trim();
        const desc = (values.advert?.descriptionHtml ?? "").trim();
        if (jd && !desc) {
            void setFieldValue("advert.descriptionHtml", jd);
        }
        void setFieldValue("descriptionPrefillDone", true);
    }, [values.descriptionPrefillDone, values.role?.jobDescription, values.advert?.descriptionHtml, setFieldValue]);
    return null;
}

function RoleLeaf({
    args,
}: {
    args: BuildJobCreateArgs;
}) {
    const { values, setFieldValue } = useFormikContext<JobCreateFormValues>();
    return (
        <FormSection tone={TRIO.blue} icon="briefcase" title="Internal role" desc="Headcount request — who, where, and the pay band.">
            <Box sx={{ pt: FORM_SPACE.fieldGap / 2 }}>
                <RequisitionFormFields
                    value={values.role}
                    onChange={(role) => void setFieldValue("role", role)}
                    headcountText={values.headcountText}
                    onHeadcountTextChange={(t) => void setFieldValue("headcountText", t)}
                    companyId={args.companyId}
                    bandCurrency={args.bandCurrency}
                    branchUsable={args.branchUsable}
                    levels={args.levels}
                    hideLevels={args.hideLevels}
                    stages={args.stages}
                    rejectedNotice={args.rejectedNotice}
                    disabled={args.disabled || args.roleDisabled}
                />
            </Box>
        </FormSection>
    );
}

/** Attach-only: pick an open role; seed role slice for summary + JD prefill (DRY with edit loader). */
function AttachRoleLeaf({ args }: { args: BuildJobCreateArgs }) {
    const { values, setFieldValue } = useFormikContext<JobCreateFormValues>();
    const selectedId = values.advert.requisitionId ?? "";
    const options = args.roleOptions ?? [];

    const { data: selectedReq } = useQuery({
        queryKey: [...queryKeys.recruitment.requisitions(args.companyId), "one", selectedId],
        queryFn: () => getRequisitionById(selectedId),
        enabled: Boolean(selectedId),
    });

    useEffect(() => {
        if (!selectedReq) return;
        const seeded = jobCreateValuesFromEntities(selectedReq, null);
        void setFieldValue("role", seeded.role);
        void setFieldValue("headcountText", seeded.headcountText);
        void setFieldValue("advert.requisitionId", selectedReq.id);
        if (!(values.advert.title ?? "").trim()) {
            void setFieldValue("advert.title", selectedReq.title);
        }
        // Allow AdvertDescriptionPrefill to copy JD once after a role is chosen.
        void setFieldValue("descriptionPrefillDone", false);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-seed when the chosen role changes
    }, [selectedReq?.id]);

    return (
        <FormSection
            tone={TRIO.blue}
            icon="briefcase"
            title="Choose role"
            desc="Only approved, open roles can be advertised."
        >
            <Box sx={{ pt: FORM_SPACE.fieldGap / 2 }}>
                <WtField
                    label="Role"
                    required
                    fullWidth
                    value={selectedId}
                    onChange={(v) => void setFieldValue("advert.requisitionId", v || "")}
                    options={options.map((r) => ({
                        value: r.id,
                        label: r.prefix ? `${r.prefix} · ${r.title}` : r.title,
                    }))}
                    searchable={options.length >= SEARCHABLE_FROM}
                    placeholder={
                        args.rolesLoading
                            ? "Loading roles…"
                            : options.length
                              ? "Choose an approved role"
                              : "No approved roles yet"
                    }
                    disabled={args.disabled || args.rolesLoading || options.length === 0}
                    hint="The role an advert points at cannot be changed later — its public link is minted for this one."
                />
                {selectedReq?.title && (
                    <Typography sx={{ mt: 1.5, fontSize: 13, color: "text.secondary" }}>
                        Internal role: <strong>{selectedReq.title}</strong>
                        {selectedReq.prefix ? ` (${selectedReq.prefix})` : ""}
                    </Typography>
                )}
            </Box>
        </FormSection>
    );
}

function AdvertLeaf({ args }: { args: BuildJobCreateArgs }) {
    const { values, setFieldValue } = useFormikContext<JobCreateFormValues>();
    return (
        <FormSection tone={TRIO.cyan} icon="share" title="Careers advert" desc="What candidates see on the public careers page.">
            <AdvertDescriptionPrefill />
            <Box sx={{ pt: FORM_SPACE.fieldGap / 2 }}>
                <PostingFormFields
                    value={values.advert}
                    onChange={(advert) => void setFieldValue("advert", advert)}
                    showPublishSwitch={false}
                    disabled={args.disabled}
                />
            </Box>
        </FormSection>
    );
}

function ScreeningLeaf({ args }: { args: BuildJobCreateArgs }) {
    const { values, setFieldValue } = useFormikContext<JobCreateFormValues>();
    return (
        <FormSection tone={TRIO.purple} icon="questionnaire-tablet" title="Screening questions" desc="Extra fields on the public apply form. Knock-outs reject immediately.">
            <Box sx={{ pt: FORM_SPACE.fieldGap / 2 }}>
                <ApplyFormConfigBuilder
                    value={values.applyFormConfig}
                    onChange={(applyFormConfig) => void setFieldValue("applyFormConfig", applyFormConfig)}
                    disabled={args.disabled}
                />
            </Box>
        </FormSection>
    );
}

const attachRoleChosen = (v: JobCreateFormValues) => Boolean(v.advert?.requisitionId);

/**
 * Create / Edit / Attach Advert wizard rail — Role · Advert · Screening.
 * Attach reuses Advert + Screening; Role step is a picker (no new requisition).
 */
export function buildJobCreateWizardGroups(args: BuildJobCreateArgs): OnboardingGroup[] {
    const attach = Boolean(args.attachMode);
    return [
        {
            id: "role-group",
            label: "Role",
            icon: <WorkOutlineOutlined />,
            children: [
                attach
                    ? {
                        id: "role",
                        label: "Choose role",
                        title: "Choose role",
                        subtitle: "Approved open role this advert belongs to",
                        icon: <WorkOutlineOutlined />,
                        fields: ["advert"],
                        requiredFields: ["advert"],
                        isComplete: (v) => attachRoleChosen(v as JobCreateFormValues),
                        render: (_p: OnboardingSectionsProps) => <AttachRoleLeaf args={args} />,
                    }
                    : {
                        id: "role",
                        label: "Internal role",
                        title: "Internal role",
                        subtitle: "Title, org, headcount and CTC",
                        icon: <WorkOutlineOutlined />,
                        fields: ["role", "headcountText"],
                        requiredFields: ["role"],
                        isComplete: (v) => roleSectionComplete(v as JobCreateFormValues),
                        render: (_p: OnboardingSectionsProps) => <RoleLeaf args={args} />,
                    },
            ],
        },
        {
            id: "advert-group",
            label: "Advert",
            icon: <CampaignOutlined />,
            children: [
                {
                    id: "advert",
                    label: "Careers advert",
                    title: "Careers advert",
                    subtitle: "Public title, location and description",
                    icon: <CampaignOutlined />,
                    fields: ["advert"],
                    render: (_p: OnboardingSectionsProps) => <AdvertLeaf args={args} />,
                },
            ],
        },
        {
            id: "screening-group",
            label: "Screening",
            icon: <QuizOutlined />,
            children: [
                {
                    id: "screening",
                    label: "Questions",
                    title: "Screening questions",
                    subtitle: "Optional apply-form fields",
                    icon: <QuizOutlined />,
                    fields: ["applyFormConfig"],
                    render: (_p: OnboardingSectionsProps) => <ScreeningLeaf args={args} />,
                },
            ],
        },
    ];
}
