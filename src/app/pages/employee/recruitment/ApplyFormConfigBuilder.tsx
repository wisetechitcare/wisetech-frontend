import { Box, Stack, Typography } from "@mui/material";
import { WtField, WtSwitchField, WtButton, ActionIconButton } from "@app/modules/common/components/ui";
import type { ApplyFormConfig, ApplyFormField, ApplyFormFieldType } from "@services/recruitment";

const TYPE_OPTIONS: { value: ApplyFormFieldType; label: string }[] = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "select", label: "Select" },
    { value: "boolean", label: "Yes / No" },
    { value: "date", label: "Date" },
];

const newField = (): ApplyFormField => ({
    id: `f_${Math.random().toString(36).slice(2, 10)}`,
    type: "text",
    label: "",
    required: false,
});

export interface ApplyFormConfigBuilderProps {
    value: ApplyFormConfig | null | undefined;
    onChange: (next: ApplyFormConfig) => void;
    disabled?: boolean;
}

/**
 * Per-advert custom questions for the public careers apply form.
 * Persisted as `JobPosting.applyFormConfig` — no AI.
 */
export function ApplyFormConfigBuilder({ value, onChange, disabled }: ApplyFormConfigBuilderProps) {
    const fields = value?.fields ?? [];

    const setFields = (next: ApplyFormField[]) => onChange({ fields: next });

    const update = (index: number, patch: Partial<ApplyFormField>) => {
        setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    };

    const remove = (index: number) => setFields(fields.filter((_, i) => i !== index));

    return (
        <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>Application questions</Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
                Extra fields on the public apply form. Knock-out answers reject the application immediately.
            </Typography>

            <Stack spacing={1.5}>
                {fields.map((field, index) => (
                    <Box
                        key={field.id}
                        sx={{
                            p: 1.5,
                            borderRadius: 1.5,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "action.hover",
                        }}
                    >
                        <Stack spacing={1.25}>
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <WtField
                                    label="Label"
                                    required
                                    fullWidth
                                    sx={{ flex: 1 }}
                                    value={field.label}
                                    onChange={(v) => update(index, { label: v })}
                                    disabled={disabled}
                                    placeholder="e.g. Do you need visa sponsorship?"
                                />
                                <Box sx={{ pt: 0.5 }}>
                                    <ActionIconButton
                                        iconName="trash"
                                        title="Remove question"
                                        tone="danger"
                                        onClick={() => remove(index)}
                                        disabled={disabled}
                                    />
                                </Box>
                            </Stack>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                                <WtField
                                    label="Type"
                                    sx={{ flex: 1 }}
                                    value={field.type}
                                    onChange={(v) => {
                                        const type = v as ApplyFormFieldType;
                                        update(index, {
                                            type,
                                            options: type === "select" ? (field.options?.length ? field.options : [""]) : undefined,
                                            knockout: type === "boolean" || type === "select" ? field.knockout : null,
                                        });
                                    }}
                                    options={TYPE_OPTIONS}
                                    disabled={disabled}
                                />
                                {field.type === "select" && (
                                    <WtField
                                        label="Options (comma-separated)"
                                        sx={{ flex: 2 }}
                                        value={(field.options ?? []).join(", ")}
                                        onChange={(v) =>
                                            update(index, {
                                                options: v.split(",").map((s: string) => s.trim()).filter(Boolean),
                                            })
                                        }
                                        disabled={disabled}
                                        placeholder="Yes, No"
                                    />
                                )}
                            </Stack>
                            <WtSwitchField
                                title="Required"
                                checked={!!field.required}
                                onChange={(e) => update(index, { required: e.target.checked })}
                                disabled={disabled}
                            />
                            {(field.type === "select" || field.type === "boolean") && (
                                <WtField
                                    label="Knock-out answer (optional)"
                                    fullWidth
                                    value={
                                        field.knockout == null
                                            ? ""
                                            : field.type === "boolean"
                                                ? field.knockout.value === true
                                                    ? "true"
                                                    : field.knockout.value === false
                                                        ? "false"
                                                        : String(field.knockout.value)
                                                : String(field.knockout.value)
                                    }
                                    onChange={(v) => {
                                        const t = v.trim();
                                        if (!t) {
                                            update(index, { knockout: null });
                                            return;
                                        }
                                        if (field.type === "boolean") {
                                            if (t === "true" || t === "yes") update(index, { knockout: { value: true } });
                                            else if (t === "false" || t === "no") update(index, { knockout: { value: false } });
                                            else update(index, { knockout: { value: t } });
                                            return;
                                        }
                                        update(index, { knockout: { value: t } });
                                    }}
                                    disabled={disabled}
                                    hint={
                                        field.type === "boolean"
                                            ? 'Use "true" or "false". Matching answers are rejected.'
                                            : "Must match one of the options exactly."
                                    }
                                    options={
                                        field.type === "boolean"
                                            ? [
                                                { value: "", label: "None" },
                                                { value: "true", label: "Yes (true)" },
                                                { value: "false", label: "No (false)" },
                                            ]
                                            : [
                                                { value: "", label: "None" },
                                                ...(field.options ?? []).map((o) => ({ value: o, label: o })),
                                            ]
                                    }
                                />
                            )}
                        </Stack>
                    </Box>
                ))}
            </Stack>

            <Box sx={{ mt: 1.5 }}>
                <WtButton
                    ghost
                    size="small"
                    onClick={() => setFields([...fields, newField()])}
                    disabled={disabled || fields.length >= 20}
                >
                    Add question
                </WtButton>
            </Box>
        </Box>
    );
}

export default ApplyFormConfigBuilder;
