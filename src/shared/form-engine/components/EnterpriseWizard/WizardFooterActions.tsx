import React from "react";
import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { WtButton } from "@app/modules/common/components/ui";

export interface WizardFooterActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  /** Left-footer save: saves from any step without walking the rest of the form. */
  onDirectSave: () => void;
  directSaveLabel: string;
  directSaveDisabled?: boolean;
  /** Extra left-cluster content after the save (draft button, draft status). */
  leftExtra?: React.ReactNode;
  onBack: () => void;
  backDisabled: boolean;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  /** Replaces the primary button (e.g. Lead's "Save as Update" / "Save as Revision" pair). */
  nextSlot?: React.ReactNode;
}

/**
 * The one wizard footer: Cancel + Save on the left, Back + Save & Continue on the right.
 * Both wizard layouts (GroupedWizard and the steps wizard) render this, so every form
 * — Employee, Contact, Company, Lead — has the same buttons in the same places.
 */
export function WizardFooterActions({
  isSubmitting, onCancel, onDirectSave, directSaveLabel, directSaveDisabled, leftExtra,
  onBack, backDisabled, onNext, nextLabel, nextDisabled, nextSlot,
}: WizardFooterActionsProps) {
  return (
    <>
      {/* Phones: each cluster takes a full row and its buttons share it equally. */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", flex: { xs: "1 1 100%", sm: "0 1 auto" }, "& > .MuiButton-root": { flex: { xs: 1, sm: "none" } } }}>
        <WtButton ghost onClick={onCancel} disabled={isSubmitting}>Cancel</WtButton>
        {/* Secondary save — outlined, so the footer has exactly one filled primary action. */}
        <WtButton inverted onClick={onDirectSave} disabled={isSubmitting || directSaveDisabled}
          sx={(theme) => (theme.palette.mode === "dark" ? {} : { borderColor: alpha(theme.palette.primary.main, 0.45), boxShadow: "none" })}>
          {isSubmitting ? "Saving…" : directSaveLabel}
        </WtButton>
        {leftExtra}
      </Box>
      <Box sx={{ display: "flex", gap: 1, flex: { xs: "1 1 100%", sm: "1 1 auto" }, justifyContent: "flex-end", "& > .MuiButton-root": { flex: { xs: 1, sm: "none" } } }}>
        <WtButton ghost startIcon={<ChevronLeft />} onClick={onBack} disabled={backDisabled || isSubmitting}>Back</WtButton>
        {nextSlot ?? (
          <WtButton tone="primary" endIcon={<ChevronRight />} onClick={onNext} disabled={isSubmitting || nextDisabled}>
            {isSubmitting ? "Saving…" : nextLabel}
          </WtButton>
        )}
      </Box>
    </>
  );
}
