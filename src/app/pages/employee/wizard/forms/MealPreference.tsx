import React from "react";
import RadioInput, { RadioButton } from "app/modules/common/inputs/RadioInput";
import TextInput from "app/modules/common/inputs/TextInput";

const mealPreferencesRadioBtns: RadioButton[] = [
  { label: "Vegetarian", value: "0" },
  { label: "Non-Vegetarian", value: "1" },
  { label: "Vegan", value: "2" },
];

function MealPreferences({ formikProps }: any) {
  return (
    <div className="d-flex flex-column" style={{ gap: "0px" }}>
      {/* Row 1: Meal Preference */}
      <div className="row g-3 m-0">
        <div className="col-12">
          <label className="form-label fw-semibold mb-4">Meal Preference</label>

          {/* Radios in one row on desktop, stacked on mobile */}
          <div className="d-flex flex-lg-row flex-column gap-3 flex-wrap">
            {mealPreferencesRadioBtns.map((btn, i) => (
              <div key={i}>
                <RadioInput
                  isRequired={false}
                  radioBtns={[btn]} // one per input
                  formikField="meal"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Hobbies */}
      <div className="row g-3 m-0">
        <div className="col-12">
          <TextInput
            isRequired={false}
            label="Hobbies"
            formikField="hobbies"
            margin="mb-0"
          />
        </div>
      </div>

      {/* Row 3: Notes */}
      <div className="row g-3 m-0">
        <div className="col-12">
          <TextInput
            isRequired={false}
            label="Notes"
            formikField="notes"
            margin="mb-0"
          />
        </div>
      </div>
    </div>
  );
}

export default MealPreferences;
