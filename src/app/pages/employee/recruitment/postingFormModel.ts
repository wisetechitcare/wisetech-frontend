import type { ApplyFormConfig, PostingPayload } from "@services/recruitment";

/**
 * Blank job advert. Shared by Adverts edit/attach modal and Create Role wizard.
 */
export const emptyPostingForm = (): PostingPayload => ({
    requisitionId: "",
    title: "",
    location: "",
    isRemote: false,
    employmentType: "Full-time",
    descriptionHtml: "",
    isPublished: false,
    showSalary: false,
    expiresAt: null,
    applyFormConfig: { fields: [] },
});

export const normalizeFormConfig = (raw: ApplyFormConfig | null | undefined): ApplyFormConfig => ({
    fields: Array.isArray(raw?.fields) ? raw!.fields : [],
});

/** Strip blank labels / empty select options before POST (server Yup). */
export const sanitizeApplyFormConfig = (raw: ApplyFormConfig | null | undefined): ApplyFormConfig => ({
    fields: (raw?.fields ?? [])
        .filter((f) => f.label.trim())
        .map((f) => ({
            ...f,
            label: f.label.trim(),
            options: f.type === "select"
                ? (f.options ?? []).map((o) => o.trim()).filter(Boolean)
                : undefined,
            knockout: f.knockout ?? null,
        })),
});
