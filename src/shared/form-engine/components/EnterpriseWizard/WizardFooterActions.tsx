import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/ds/ui/button";

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

/** Phones: each cluster takes a full row and its buttons share it equally. */
const CLUSTER = "flex min-w-0 flex-[1_1_100%] flex-wrap items-center gap-2 sm:flex-[0_1_auto] [&>*]:max-sm:min-w-0 [&>*]:max-sm:flex-1";

/**
 * The one wizard footer: Cancel + Save on the left, Back + Save & Continue on the right.
 * Both wizard layouts (GroupedWizard and the steps wizard) render this, so every form has the
 * same buttons in the same places.
 */
export function WizardFooterActions({
  isSubmitting, onCancel, onDirectSave, directSaveLabel, directSaveDisabled, leftExtra,
  onBack, backDisabled, onNext, nextLabel, nextDisabled, nextSlot,
}: WizardFooterActionsProps) {
  return (
    <>
      <div className={CLUSTER}>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        {/* Secondary save — inverted, so the footer has exactly one filled primary action. */}
        <Button type="button" variant="inverted" onClick={onDirectSave} disabled={isSubmitting || directSaveDisabled}>
          {isSubmitting ? "Saving…" : directSaveLabel}
        </Button>
        {leftExtra}
      </div>
      <div className={`${CLUSTER} sm:flex-[1_1_auto] sm:justify-end`}>
        <Button type="button" variant="outline" onClick={onBack} disabled={backDisabled || isSubmitting}>
          <ChevronLeft data-icon="inline-start" />
          Back
        </Button>
        {nextSlot ?? (
          <Button type="button" onClick={onNext} disabled={isSubmitting || nextDisabled}>
            {isSubmitting ? "Saving…" : nextLabel}
            <ChevronRight data-icon="inline-end" />
          </Button>
        )}
      </div>
    </>
  );
}
