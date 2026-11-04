import React from "react";
import { useFormikContext } from "formik";
import { Box, ButtonBase, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { Star, StarBorder } from "@mui/icons-material";
import { KTIcon } from "@metronic/helpers";
import PhoneNumberInput from "@app/components/PhoneNumberInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import { ActionIconButton, ToneChip, WtButton, WtFieldFormik } from "@app/modules/common/components/ui";
import type { ContactChannel, ContactChannelInput, ContactFormValues } from "@models/companies";

type Kind = "phones" | "emails";

const LABELS: Record<Kind, string[]> = {
  phones: ["Mobile", "Work", "Home", "Other"],
  // Personal first: it is the address that still works after they change jobs.
  emails: ["Personal", "Work", "Other"],
};

let seq = 0;
const newChannelRow = (kind: Kind, value = "", label = LABELS[kind][0], isPrimary = false): ContactChannelInput => ({
  key: `c${seq++}`,
  value,
  label,
  isPrimary,
});

/**
 * Form rows for one kind, from the API's `channels` when the contact has them, else from the
 * legacy `phone`/`phone2`/`email` (a Google prefill, or a contact saved before channels).
 * Always at least one row, so an empty form still shows a field to type into.
 */
export const toChannelRows = (kind: Kind, channels: ContactChannel[] | undefined, legacy: (string | undefined)[]) => {
  const type = kind === "phones" ? "PHONE" : "EMAIL";
  const fromApi = (channels || []).filter((c) => c.type === type);
  const rows = fromApi.length
    ? fromApi.map((c) => newChannelRow(kind, c.value, c.label || "", c.isPrimary))
    : legacy.filter((v): v is string => !!v).map((v, i) => newChannelRow(kind, v, "", i === 0));
  return rows.length ? rows : [newChannelRow(kind, "", LABELS[kind][0], true)];
};

/** What the API takes: blank rows dropped, client-only `key` removed. */
export const toChannelPayload = (rows: ContactChannelInput[] = []) =>
  rows
    .map(({ value, label, isPrimary }) => ({ value: (value || "").trim(), label: label || null, isPrimary: !!isPrimary }))
    .filter((r) => r.value);

// One line from md up; on tablets Type + actions share the second line; on phones each stacks.
const rowSx = {
  display: "grid",
  columnGap: 1.5,
  rowGap: 2,
  alignItems: "center",
  p: 1.5,
  borderRadius: "12px",
  border: "1px solid transparent",
  transition: "background-color .15s, border-color .15s",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) auto", md: "minmax(0, 2fr) minmax(0, 1fr) auto" },
  gridTemplateAreas: { xs: '"value" "type" "actions"', sm: '"value value" "type actions"', md: '"value type actions"' },
} as const;

// Same soft tint as the wizard rail's current step — the app's "this one" treatment.
const primaryRowSx = (theme: Theme) => ({
  borderColor: alpha(theme.palette.primary.main, 0.18),
  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.06),
});

// The Teams roster's manager pills: amber "Primary Manager" badge, dashed "Make Manager" pill.
const PRIMARY_INK = "#b86e13";
const makePrimarySx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0.5,
  px: 1.25,
  py: 0.5,
  borderRadius: 999,
  border: "1px dashed",
  borderColor: "divider",
  bgcolor: "background.paper",
  color: "text.secondary",
  fontSize: 11.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
  "& svg": { fontSize: 15 },
  "&:hover": { borderColor: PRIMARY_INK, color: PRIMARY_INK },
  "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
} as const;

/**
 * Google-Contacts-style list: "Add" appends a row; one row per list is the primary — the one
 * greetings, meeting invites and every other screen use.
 */
export const ContactChannelFields: React.FC<{ kind: Kind; hint?: string }> = ({ kind, hint }) => {
  const { values, setFieldValue } = useFormikContext<ContactFormValues>();
  const rows = values[kind] || [];
  const title = kind === "phones" ? "Phone" : "Email";
  const options = LABELS[kind].map((l) => ({ value: l, label: l }));

  const setPrimary = (index: number) =>
    setFieldValue(kind, rows.map((r, i) => ({ ...r, isPrimary: i === index })));

  // Removing the primary hands it to the first row left, so there is never a list without one.
  const removeAt = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    if (rows[index].isPrimary && next.length) next[0] = { ...next[0], isPrimary: true };
    setFieldValue(kind, next);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {rows.map((row, i) => {
        const fieldLabel = i === 0 ? title : `${title} ${i + 1}`;
                return (
          <Box key={row.key} sx={row.isPrimary ? [rowSx, primaryRowSx] : rowSx}>
            <Box sx={{ gridArea: "value", minWidth: 0 }}>
              {kind === "phones" ? (
                <PhoneNumberInput
                  label={fieldLabel}
                  placeholder="Enter phone"
                  formikField={`phones.${i}.value`}
                  isRequired={false}
                />
              ) : (
                <TextInput
                  label={fieldLabel}
                  placeholder="Enter email"
                  formikField={`emails.${i}.value`}
                  type="email"
                  isRequired={false}
                />
              )}
            </Box>
            <Box sx={{ gridArea: "type", minWidth: 0 }}>
              <WtFieldFormik name={`${kind}.${i}.label`} label="Type" options={options} disableAlphabeticalSort />
            </Box>
            <Box sx={{ gridArea: "actions", display: "flex", alignItems: "center", justifyContent: { xs: "space-between", sm: "flex-end" }, gap: 1 }}>
              {/* Fixed slot so the badge and the pill line up across rows. */}
              <Box sx={{ width: { sm: 124 }, display: "flex", justifyContent: { xs: "flex-start", sm: "center" } }}>
                {row.isPrimary ? (
                  <ToneChip dense color={PRIMARY_INK} label="Primary" icon={<Star />}
                    sx={{ "& .MuiChip-icon": { color: PRIMARY_INK, fontSize: 14, ml: 0.75 } }} />
                ) : (
                  <ButtonBase onClick={() => setPrimary(i)} aria-label={`Make ${fieldLabel.toLowerCase()} primary`} sx={makePrimarySx}>
                    <StarBorder /> Make primary
                  </ButtonBase>
                )}
              </Box>
              {/* Fixed width so the columns line up whether or not the row can be removed. */}
              <Box sx={{ width: 40, display: "flex", justifyContent: "flex-end" }}>
                {rows.length > 1 && (
                  <ActionIconButton
                    iconName="trash"
                    tone="danger"
                    title={`Remove ${fieldLabel.toLowerCase()}`}
                    onClick={() => removeAt(i)}
                  />
                )}
              </Box>
            </Box>
          </Box>
        );
      })}
      <WtButton
        ghost
        sx={{ alignSelf: "flex-start", ml: 1 }}
        startIcon={<KTIcon iconName="plus" className="fs-5" />}
        onClick={() => setFieldValue(kind, [...rows, newChannelRow(kind, "", LABELS[kind][0], rows.length === 0)])}
      >
        Add {kind === "phones" ? "phone" : "email"}
      </WtButton>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 1.5 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
};
