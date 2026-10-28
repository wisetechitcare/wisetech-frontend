import { Box, Stack } from "@mui/material";
import {
  FormSection, FORM_SPACE, TRIO, WtChoiceField,
} from "@app/modules/common/components/ui";

const MEAL_OPTIONS = [
  { value: "0", label: "Vegetarian" },
  { value: "1", label: "Non-Vegetarian" },
  { value: "2", label: "Vegan" },
] as const;

/**
 * Candidate Additional Details leaf — meal preference only (recruitment-local kit).
 * Omits dead hobbies/notes from MealPreference.tsx; does not edit that shared form.
 */
export function CandidateMealSection({ disabled }: { disabled?: boolean }) {
  return (
    <FormSection
      tone={TRIO.green}
      icon="abstract-26"
      title="Dietary preference"
      desc="Optional — used for office catering when they join."
    >
      <Stack spacing={FORM_SPACE.fieldGap} sx={{ pt: FORM_SPACE.fieldGap / 2, maxWidth: { md: 360 } }}>
        <Box>
          <WtChoiceField
            name="meal"
            label="Meal preference"
            variant="segmented"
            options={MEAL_OPTIONS}
            disabled={disabled}
          />
        </Box>
      </Stack>
    </FormSection>
  );
}

export default CandidateMealSection;
