import React from "react";
import dayjs from "dayjs";
import { useFormikContext } from "formik";
import { Box, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { South } from "@mui/icons-material";
import { KTIcon } from "@metronic/helpers";
import DateInput from "@app/modules/common/inputs/DateInput";
import { ToneChip, WtButton } from "@app/modules/common/components/ui";
import type { ContactCompanyStint, ContactFormValues } from "@models/companies";

const monthYear = (d?: string | null) => (d ? dayjs(d).format("MMM YYYY") : "");

/** "Jan 2024 – Oct 2026", or "Until Oct 2026" when the start is not known. */
export const stintDates = (s: Pick<ContactCompanyStint, "startDate" | "endDate">) =>
  s.startDate ? `${monthYear(s.startDate)} – ${monthYear(s.endDate) || "Present"}` : `Until ${monthYear(s.endDate)}`;

/** What they were at the company they are leaving — captured by name when the move starts. */
export interface MovedFrom {
  companyName: string;
  branch?: string;
  role?: string;
  status?: string;
  services: string[];
}

const LeavingField: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary", mb: 0.25 }}>{label}</Typography>
    <Typography sx={{ fontSize: 14, fontWeight: 600, color: value ? "text.primary" : "text.disabled", overflowWrap: "anywhere" }}>
      {value || "—"}
    </Typography>
  </Box>
);

const panelSx = (color: (t: Theme) => string, dashed = false) => (theme: Theme) => ({
  p: { xs: 1.5, sm: 2 },
  borderRadius: "12px",
  border: `1px ${dashed ? "dashed" : "solid"} ${alpha(color(theme), 0.45)}`,
  bgcolor: alpha(color(theme), theme.palette.mode === "dark" ? 0.12 : 0.05),
});

/**
 * Wraps the Company step's fields. Normally it renders them as they are — editing them there
 * CORRECTS the company. During a move (started by "Move to another company") the company they
 * are leaving sits on top, read-only, and the same fields below become the company they join.
 */
export const CompanyMoveStage: React.FC<{
  movedFrom: MovedFrom | null;
  onUndo: () => void;
  children: React.ReactNode;
}> = ({ movedFrom, onUndo, children }) => {
  const formik = useFormikContext<ContactFormValues>();
  if (!movedFrom) return <>{children}</>;

  const workPrimary = formik.values.emails?.find((e) => e.isPrimary && e.label === "Work" && e.value);
  const leftOn = formik.values.companyMovedOn ? dayjs(formik.values.companyMovedOn).format("DD MMM YYYY") : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Box sx={panelSx((t) => t.palette.text.secondary, true)}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.5 }}>
          <ToneChip dense tone="warning" label={leftOn ? `Leaving · ${leftOn}` : "Leaving"} />
          <WtButton ghost size="small" onClick={onUndo} startIcon={<KTIcon iconName="arrow-left" className="fs-5" />}>
            Undo move
          </WtButton>
        </Box>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "2fr 1fr 1fr 1fr" } }}>
          <LeavingField label="Company" value={movedFrom.companyName} />
          <LeavingField label="Branch" value={movedFrom.branch} />
          <LeavingField label="Designation" value={movedFrom.role} />
          <LeavingField label="Status" value={movedFrom.status} />
          {movedFrom.services.length > 0 && (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <LeavingField label="Sub-services" value={movedFrom.services.join(", ")} />
            </Box>
          )}
        </Box>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 1.5 }}>
          Kept under Previous companies when you save. Old leads and projects stay with it.
        </Typography>
      </Box>

      <Box aria-hidden sx={{ display: "flex", justifyContent: "center", py: 0.75, color: "text.disabled" }}>
        <South fontSize="small" />
      </Box>

      <Box sx={panelSx((t) => t.palette.success.main)}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2 }}>
          <ToneChip dense tone="success" label="Joining" />
          <Box className="crm-date-field" sx={{ width: { xs: "100%", sm: 260 } }}>
            <DateInput formikField="companyMovedOn" formikProps={formik} inputLabel="Joined on" isRequired={false} />
          </Box>
        </Box>
        {children}
        {workPrimary && (
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "warning.dark", mt: 2 }}>
            Their primary email ({workPrimary.value}) is a Work address. Make a personal or new email primary on the
            Contact step so birthday greetings still reach them.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

/**
 * Below the fields: the "Move to another company" button (existing contacts, not mid-move)
 * and the read-only Previous companies list.
 */
export const CompanyMoveFields: React.FC<{
  canMove: boolean;
  moving: boolean;
  originalCompanyName: string;
  history: ContactCompanyStint[];
  onMove: () => void;
}> = ({ canMove, moving, originalCompanyName, history, onMove }) => {
  const previous = history.filter((s) => s.endDate);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 3 }}>
      {canMove && !moving && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
          <WtButton ghost onClick={onMove} startIcon={<KTIcon iconName="arrows-loop" className="fs-4" />}>
            Move to another company
          </WtButton>
          <Typography variant="caption" color="text.secondary">
            Changed jobs? {originalCompanyName} stays in their history. To fix a wrongly picked company, just change it above.
          </Typography>
        </Box>
      )}

      {previous.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 1 }}>
            Previous companies
          </Typography>
          <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, borderTop: 1, borderColor: "divider" }}>
            {previous.map((s) => {
              const role = s.contactRole?.name || s.roleInCompany;
              return (
                <Box component="li" key={s.id} sx={{
                  display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between",
                  columnGap: 2, rowGap: 0.25, py: 1.25, borderBottom: 1, borderColor: "divider",
                }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="span" sx={{ fontSize: 14, fontWeight: 600 }}>
                      {s.company?.companyName || "Removed company"}
                    </Typography>
                    {role && (
                      <Typography component="span" sx={{ fontSize: 13, color: "text.secondary", ml: 1 }}>
                        {role}
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                    {stintDates(s)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};
