import React from "react";
import { Box, InputBase, Stack, Tooltip, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import type { FieldPolicy } from "@services/documents";
import { fieldMeta, groupFields } from "./fieldMeta";

/**
 * The editable half of the document, as a two-column schedule.
 *
 * BUILT FROM THE TEMPLATE'S CONTRACT, not from a hardcoded form. The inputs are
 * whatever `policy.editable` lists, so a template that adds a Terms block gets a
 * Terms input with no change here, and a template that has no Notes section
 * cannot grow a Notes input that prints nowhere.
 *
 * WHY LABEL-BESIDE-VALUE: the printed sheet is itself a label/value table —
 * "Invoice No. : WT/PI/0007", "Bill Dated : 21 September 2026". Stacking the
 * label above the value made the panel speak a different language from the
 * document it edits, and cost roughly double the height per field, which turned
 * twelve fields into a long scroll. Beside it, every value starts on ONE
 * alignment line down the whole panel, and a field is one glance rather than two.
 *
 * Everything shares a single left edge — group heading, label, and rule all start
 * at the same x. The earlier pass had three different ones.
 *
 * AFFORDANCE lives in interaction, not in permanent boxes: a row washes on hover
 * and its value takes a blue underline on focus. That also gives keyboard users a
 * visible focus target, which a bare borderless input does not.
 */

/** The tint `DocumentSheet` paints over editable regions. Kept in step by hand. */
const EDIT_BLUE = "#5FA8DF";
const RULE = "#E8ECF2";

/** The alignment line every value starts on. */
const LABEL_W = 116;

export interface DocumentPropertiesPanelProps {
  policy: FieldPolicy;
  values: Record<string, string>;
  disabled: boolean;
  onChange: (field: string, value: string) => void;
}

const DocumentPropertiesPanel: React.FC<DocumentPropertiesPanelProps> = ({
  policy, values, disabled, onChange,
}) => {
  const required = new Set(policy.required);
  const isMissing = (field: string) =>
    required.has(field) && !String(values[field] ?? "").trim();

  return (
    <Box>
      {groupFields(policy.editable).map(({ group, fields }) => {
        const missingHere = fields.filter(isMissing).length;

        return (
          <Box key={group} sx={{ mb: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 0.5 }}
            >
              <Typography
                sx={{ fontSize: 12.5, fontWeight: 700, color: "text.primary" }}
              >
                {group}
              </Typography>
              {missingHere > 0 && (
                <Tooltip title={`${missingHere} required field${missingHere === 1 ? "" : "s"} still empty here`}>
                  <Box
                    sx={{
                      minWidth: 17, height: 17, px: 0.5,
                      display: "grid", placeItems: "center", borderRadius: "9px",
                      bgcolor: "error.main", color: "#fff", fontSize: 10, fontWeight: 700,
                    }}
                  >
                    {missingHere}
                  </Box>
                </Tooltip>
              )}
            </Stack>

            <Box sx={{ borderTop: `1px solid ${RULE}` }}>
              {fields.map((field) => {
                const meta = fieldMeta(field);
                const value = String(values[field] ?? "");
                const missing = isMissing(field);
                const hint = missing ? "Needed before publishing" : meta.hint;

                return (
                  <Box
                    key={field}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.25,
                      py: 0.85,
                      borderBottom: `1px solid ${RULE}`,
                      transition: "background-color .12s ease",
                      ...(disabled ? {} : { "&:hover": { bgcolor: "action.hover" } }),
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="baseline"
                      spacing={0.3}
                      sx={{ width: LABEL_W, flexShrink: 0, pt: 0.15 }}
                    >
                      <Typography
                        component="label"
                        htmlFor={`doc-field-${field}`}
                        sx={{
                          fontSize: 11.5,
                          fontWeight: 500,
                          lineHeight: 1.35,
                          color: missing ? "error.main" : "text.secondary",
                          cursor: disabled ? "default" : "text",
                        }}
                      >
                        {meta.label}
                      </Typography>
                      {required.has(field) && (
                        <Typography sx={{ fontSize: 11, color: "error.main", lineHeight: 1 }}>*</Typography>
                      )}
                    </Stack>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <InputBase
                        id={`doc-field-${field}`}
                        fullWidth
                        disabled={disabled}
                        multiline={meta.multiline}
                        value={value}
                        placeholder={disabled ? "—" : "Not set"}
                        onChange={(event) => onChange(field, event.target.value)}
                        sx={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "text.primary",
                          // Tabular figures: account numbers, IFSC and SAC codes
                          // get read digit by digit against another document.
                          fontVariantNumeric: "tabular-nums",
                          "& .MuiInputBase-input": {
                            p: 0,
                            lineHeight: 1.4,
                            // The underline IS the affordance — it appears where
                            // you are typing rather than boxing every field all
                            // the time.
                            borderBottom: "1px solid transparent",
                            transition: "border-color .12s ease",
                          },
                          "& .MuiInputBase-input::placeholder": { color: "text.disabled", opacity: 1 },
                          "& .MuiInputBase-input:hover": {
                            borderBottomColor: disabled ? "transparent" : RULE,
                          },
                          "& .MuiInputBase-input:focus": {
                            outline: "none",
                            borderBottomColor: EDIT_BLUE,
                          },
                        }}
                      />
                      {hint && (
                        <Typography
                          sx={{
                            fontSize: 10,
                            lineHeight: 1.4,
                            mt: 0.2,
                            color: missing ? "error.main" : "text.disabled",
                          }}
                        >
                          {hint}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}

      <Box sx={{ mt: 2.5 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>
          Set by the record, not here
        </Typography>
        <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 1, lineHeight: 1.5 }}>
          Client, project, deliverables, amounts, GST and the document number come
          straight from the bill this was raised from. To change one, change the
          record it came from.
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {policy.locked.map((field) => (
            <Tooltip key={field} title={field} placement="top">
              <Box
                sx={{
                  display: "inline-flex", alignItems: "center", gap: 0.4,
                  px: 0.75, py: 0.25, borderRadius: "6px", fontSize: 10.5,
                  color: "text.secondary", bgcolor: "action.hover",
                  border: `1px solid ${RULE}`,
                }}
              >
                <KTIcon iconName="lock-2" className="fs-9" />
                {fieldMeta(field).label}
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default DocumentPropertiesPanel;
