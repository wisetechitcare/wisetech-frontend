// import { Field } from "formik";
// import HighlightErrors from "../../errors/components/HighlightErrors";

// export interface RadioButton {
//     label: string;
//     value: string;
// }

// interface RadioInputProps {
//     isRequired: boolean;
//     inputLabel?: string;
//     radioBtns: RadioButton[];
//     formikField: string;
//     customCss?: string;
// }

// function RadioInput({ isRequired, inputLabel, radioBtns, formikField, customCss="" }: RadioInputProps) {

//     return (
//         <div className={`d-flex flex-column mb-7 fv-row`}>
//             {inputLabel && <label className='d-flex align-items-center fs-6 fw-bold form-label mb-2'>
//                 <span className={`${isRequired ? 'required' : ''}`}>{inputLabel}</span>
//             </label>}

//             <span className={`form-check form-check-custom form-check-solid ${customCss}`}>
//                 {radioBtns.map((radioBtn: RadioButton, index: number) => (
//                     <div key={`${radioBtn.value}-${index}`}>
//                         <Field
//                             className='form-check-input'
//                             type='radio'
//                             name={formikField}
//                             value={radioBtn.value}
//                          />
//                         <span className="px-2">{radioBtn.label}</span>
//                     </div>
//                 ))}
//             </span>

//             <HighlightErrors isRequired={isRequired} formikField={formikField} />
//         </div>
//     );
// }

// export default RadioInput;

import { Field } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";

export interface RadioButton {
  label: string;
  value: any;
}

interface RadioInputProps {
  isRequired: boolean;
  inputLabel?: string;
  radioBtns: RadioButton[];
  formikField: string;
  customCss?: string;
}

function RadioInput({ isRequired, inputLabel, radioBtns, formikField, customCss = "" }: RadioInputProps) {
  return (
    <div className={`d-flex flex-column mb-7 fv-row`}>
      {inputLabel && (
        <label className="d-flex align-items-center fs-6 fw-bold form-label mb-2">
          <span className={`${isRequired ? "required" : ""}`}>{inputLabel}</span>
        </label>
      )}

      <div className={`d-flex gap-4 ${customCss}`}>
        {radioBtns.map((radioBtn: RadioButton, index: number) => (
          <label key={`${radioBtn.value}-${index}`} className="radio-container">
            <Field name={formikField}>
              {({ field, form }: any) => {
                const current = field.value;
                // Never report "checked" when the field is unset — String(null) === "null"
                // collides with no option, but boolean coercion ensures clean rendering.
                const isChecked =
                  current !== null &&
                  current !== undefined &&
                  current !== "" &&
                  String(current) === String(radioBtn.value);
                return (
                  <input
                    className="form-check-input"
                    type="radio"
                    name={formikField}
                    value={String(radioBtn.value)}
                    checked={isChecked}
                    onChange={() => {
                      form.setFieldValue(formikField, radioBtn.value);
                    }}
                  />
                );
              }}
            </Field>
            <span className="custom-radio"></span>
            <span className="px-2">{radioBtn.label}</span>
          </label>
        ))}
      </div>

      <HighlightErrors isRequired={isRequired} formikField={formikField} />

      <style>{`
        .radio-container {
          position: relative;
          display: flex;
          align-items: center;
          cursor: pointer;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          color: #252f4a;
          line-height: 1;
        }

        .radio-container input[type="radio"] {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          width: 0;
          height: 0;
        }

        /* custom radio circle */
        .custom-radio {
          flex-shrink: 0;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background-color: #EEF1F7;
          border: 2px solid #d1d5e0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease-in-out;
        }

        /* When checked, show red fill */
        .radio-container input[type="radio"]:checked ~ .custom-radio {
          background-color: #F1CCCC;
          border-color: #9D4141;
        }

        /* inner dot */
        .radio-container input[type="radio"]:checked ~ .custom-radio::after {
          content: "";
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #9D4141;
        }
      `}</style>
    </div>
  );
}

export default RadioInput;
