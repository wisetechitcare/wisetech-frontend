import { Stack } from "@mui/material";
import { FORM_SPACE, InlineNotice } from "@app/modules/common/components/ui";
import * as S from "../forms/onboarding/OnboardingSections";
import type { OnboardingSectionsProps } from "../forms/onboarding/OnboardingSections";

/**
 * Candidate Contact leaf — same fields as employee PersonalContactInfo, plus a
 * visible email-OR-phone requirement (softRequired hides asterisks on both).
 */
export function CandidateContactSection(props: OnboardingSectionsProps) {
  return (
    <Stack spacing={FORM_SPACE.fieldGap}>
      <InlineNotice icon="information-5">
        Email or phone is required to save this candidate — at least one must be filled in.
      </InlineNotice>
      <S.ContactInfoSection {...props} />
    </Stack>
  );
}

export default CandidateContactSection;
