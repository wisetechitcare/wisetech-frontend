import React from "react";
import dayjs from "dayjs";
import { useFormikContext } from "formik";
import { Box, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import DateInput from "@app/modules/common/inputs/DateInput";
import { InlineNotice, TRIO, WtButton } from "@app/modules/common/components/ui";
import type { ContactCompanyStint, ContactFormValues } from "@models/companies";

const monthYear = (d?: string | null) => (d ? dayjs(d).format("MMM YYYY") : "");

/** "Jan 2024 – Oct 2026", or "Until Oct 2026" when the start is not known. */
export const stintDates = (s: Pick<ContactCompanyStint, "startDate" | "endDate">) =>
  s.startDate ? `${monthYear(s.startDate)} – ${monthYear(s.endDate) || "Present"}` : `Until ${monthYear(s.endDate)}`;

interface Props {
  /** The company the contact was saved with. Empty for a new contact: nothing to move from. */
  originalCompanyId: string;
  originalCompanyName: string;
  newCompanyName?: string;
  history: ContactCompanyStint[];
  onMove: () => void;
  onUndo: () => void;
}

/**
 * The Company step's job-change controls. "Move to another company" clears the company
 * fields for the new employer; saving lets the server close the old stint (see companyMove),
 * so the old company shows under "Previous companies" and old leads stay with it.
 */
export const CompanyMoveFields: React.FC<Props> = ({
  originalCompanyId, originalCompanyName, newCompanyName, history, onMove, onUndo,
}) => {
  const formik = useFormikContext<ContactFormValues>();
  const { values } = formik;
  const moving = !!originalCompanyId && values.companyId !== originalCompanyId;
  const workPrimary = values.emails?.find((e) => e.isPrimary && e.label === "Work" && e.value);
  const previous = history.filter((s) => s.endDate);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 3 }}>
      {originalCompanyId && !moving && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
          <WtButton ghost onClick={onMove} startIcon={<KTIcon iconName="arrows-loop" className="fs-4" />}>
            Move to another company
          </WtButton>
          <Typography variant="caption" color="text.secondary">
            Changed jobs? {originalCompanyName} stays in their history with its leads and projects.
          </Typography>
        </Box>
      )}

      {moving && (
        <InlineNotice trio={TRIO.blue} icon="arrows-loop">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                Moving from {originalCompanyName}
                {newCompanyName ? ` to ${newCompanyName}` : ""}
              </Typography>
              <Typography sx={{ fontSize: 13 }}>
                {newCompanyName ? "" : "Choose the new company above. "}
                When you save, {originalCompanyName} moves to Previous companies. Old leads and projects stay with it.
              </Typography>
            </Box>
            <Box sx={{
              display: "grid", gap: 1.5, alignItems: "center",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 280px) auto" },
            }}>
              <Box className="crm-date-field">
                <DateInput formikField="companyMovedOn" formikProps={formik} inputLabel="Joined new company on" isRequired={false} />
              </Box>
              <WtButton ghost onClick={onUndo} sx={{ justifySelf: "start" }}>Undo move</WtButton>
            </Box>
            {workPrimary && (
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                Their primary email ({workPrimary.value}) is a Work address. Make a personal or new email primary on
                the Contact step so birthday greetings still reach them.
              </Typography>
            )}
          </Box>
        </InlineNotice>
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
