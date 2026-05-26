import { ErrorMessage } from "formik";

interface HighlightErrorsProps {
    formikField: string;
    isRequired: boolean;
}

function HighlightErrors({ formikField }: HighlightErrorsProps) {
    return (
        <ErrorMessage name={formikField}>
            {(msg) => <div className='text-danger mt-2 fs-7'>{msg}</div>}
        </ErrorMessage>
    );
}

export default HighlightErrors;