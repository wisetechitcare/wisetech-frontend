import React from "react";
import { Box, Stack, TextField, Typography, Tooltip } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { Eyebrow } from "@app/modules/common/components/ui";
import type { FieldPolicy } from "@services/documents";
import { fieldMeta, groupFields } from "./fieldMeta";

/**
 * The left "Editable Properties" panel.
 *
 * BUILT FROM THE TEMPLATE'S CONTRACT, not from a hardcoded form. The inputs are
 * whatever `policy.editable` lists, so a template that adds a Terms block gets a
 * Terms input with no change here, and a template that has no Notes section
 * cannot grow a Notes input that prints nowhere.
 *
 * Locked fields are shown too — as a read-only list rather than hidden — because
 * "why can't I change the client's GSTIN here" is a question worth answering on
 * the screen instead of in a support ticket.
 */

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

  return (
    <Stack spacing={2.5}>
      {groupFields(policy.editable).map(({ group, fields }) => (
        <Box key={group}>
          <Eyebrow sx={{ mb: 1 }}>{group}</Eyebrow>
          <Stack spacing={1.5}>
            {fields.map((field) => {
              const meta = fieldMeta(field);
              const isRequired = required.has(field);
              const isEmpty = !String(values[field] ?? "").trim();
              return (
                <TextField
                  key={field}
                  size="small"
                  fullWidth
                  disabled={disabled}
                  required={isRequired}
                  multiline={meta.multiline}
                  minRows={meta.multiline ? 2 : undefined}
                  label={meta.label}
                  helperText={
                    isRequired && isEmpty ? "Required before publishing" : meta.hint
                  }
                  error={isRequired && isEmpty}
                  value={values[field] ?? ""}
                  onChange={(event) => onChange(field, event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
                />
              );
            })}
          </Stack>
        </Box>
      ))}

      <Box>
        <Eyebrow sx={{ mb: 1 }}>From the ERP — not editable</Eyebrow>
        <Typography sx={{ fontSize: 11.5, color: "text.secondary", mb: 1 }}>
          Client, project, deliverables, amounts, GST and the document number come
          straight from the approved billing request. Changing one means changing the
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
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                <KTIcon iconName="lock-2" className="fs-9" />
                {fieldMeta(field).label}
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Box>
    </Stack>
  );
};

export default DocumentPropertiesPanel;
