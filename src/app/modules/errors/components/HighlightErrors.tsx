import { ErrorMessage } from "formik";

interface HighlightErrorsProps {
    formikField: string;
    isRequired: boolean;
}

function HighlightErrors({ formikField, isRequired }: HighlightErrorsProps) {
    return (
        <div className='text-danger mt-2 fs-7'>
            <ErrorMessage name={formikField} />
        </div>
    );
}

export default HighlightErrors;