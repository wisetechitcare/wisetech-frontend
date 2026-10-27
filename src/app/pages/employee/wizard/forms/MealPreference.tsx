import { Box } from "@mui/material";
import { WtChoiceField, WtFieldFormik } from "@app/modules/common/components/ui";

const mealPreferences = [
  { label: "Vegetarian", value: "0" },
  { label: "Non-Vegetarian", value: "1" },
  { label: "Vegan", value: "2" },
];

function MealPreferences({ formikProps: _formikProps }: { formikProps?: any }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Row 1: Meal Preference */}
      <Box>
          <WtChoiceField name="meal" label="Meal Preference" variant="segmented" options={mealPreferences} />
      </Box>

      {/* Row 2: Hobbies */}
      <Box>
          <WtFieldFormik
            required={false}
            label="Hobbies"
            name="hobbies"
          />
      </Box>

      {/* Row 3: Notes */}
      <Box>
          <WtFieldFormik
            required={false}
            label="Notes"
            name="notes"
          />
      </Box>
    </Box>
  );
}

export default MealPreferences;
