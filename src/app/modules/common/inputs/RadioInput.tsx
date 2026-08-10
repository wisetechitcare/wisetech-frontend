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
  hideError?: boolean;
}

function RadioInput({ isRequired, inputLabel, radioBtns, formikField, customCss = "", hideError = false }: RadioInputProps) {
  return (
    <div className={`d-flex flex-column mb-7 fv-row`}>
      {inputLabel && (
        <label className="d-flex align-items-center fs-6 fw-bold form-label mb-2">
          <span className={`${isRequired ? "required" : ""}`}>{inputLabel}</span>
        </label>
      )}

      <div className={`ob-pill-group ${customCss}`} role="group">
        {radioBtns.map((radioBtn: RadioButton, index: number) => (
          <Field name={formikField} key={`${radioBtn.value}-${index}`}>
            {({ field, form }: any) => {
              const current = field.value;
              const isChecked =
                current !== null &&
                current !== undefined &&
                current !== "" &&
                String(current) === String(radioBtn.value);
              return (
                <button
                  type="button"
                  className={`ob-pill${isChecked ? " selected" : ""}`}
                  onClick={() => {
                    form.setFieldValue(formikField, radioBtn.value);
                  }}
                  aria-pressed={isChecked}
                >
                  {radioBtn.label}
                </button>
              );
            }}
          </Field>
        ))}
      </div>

      {!hideError && <HighlightErrors isRequired={isRequired} formikField={formikField} />}

      <style>{`
        .ob-pill-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ob-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 38px;
          padding: 0 16px;
          border-radius: var(--ob-r, 8px);
          border: 1.5px solid var(--ob-border, #cbd5e1);
          background: var(--ob-surface, #fff);
          color: var(--ob-text-2, #64748b);
          font-size: 0.8375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--ob-tr, 150ms cubic-bezier(0.4,0,0.2,1));
          outline: none;
          user-select: none;
          font-family: var(--ob-font, 'Inter', sans-serif);
          letter-spacing: -0.01em;
        }
        .ob-pill:hover {
          border-color: var(--ob-accent, #1e3a8a);
          color: var(--ob-accent, #1e3a8a);
          background: var(--ob-accent-soft, rgba(30, 58, 138, 0.05));
        }
        .ob-pill.selected {
          border-color: var(--ob-accent, #1e3a8a);
          background: var(--ob-accent, #1e3a8a);
          color: #fff;
          box-shadow: 0 3px 12px var(--ob-accent-ring, rgba(30, 58, 138, 0.15));
        }
        .ob-pill.selected:hover {
          background: var(--ob-accent-hover, #1b357d);
        }
      `}</style>
    </div>
  );
}

export default RadioInput;
