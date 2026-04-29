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
    value: string;
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
                        <Field
                            className="form-check-input"
                            type="radio"
                            name={formikField}
                            value={radioBtn.value}
                        />
                        <span className="custom-radio"></span>
                        <span className="px-2">{radioBtn.label}</span>
                    </label>
                ))}
            </div>

            <HighlightErrors isRequired={isRequired} formikField={formikField} />

            <style jsx>{`
        .radio-container {
          position: relative;
          display: flex;
          align-items: center;
          cursor: pointer;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          color: #000000;
        }

        .radio-container input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
        }

        /* custom radio circle */
        .custom-radio {
          height: 21px;
          width: 21px;
          border-radius: 50%;
          background-color: #EEF1F7;
          display: inline-block;
          position: relative;
          transition: all 0.2s ease-in-out;
        }

        /* When checked, show red fill */
        .radio-container input:checked ~ .custom-radio {
          background-color: #F1CCCC;
        }

        /* inner dot */
        .radio-container input:checked ~ .custom-radio::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #9D4141;
        }
      `}</style>
        </div>
    );
}

export default RadioInput;
