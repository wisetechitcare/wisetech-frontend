import { ErrorMessage } from "formik";

interface HighlightErrorsProps {
    formikField: string;
    isRequired: boolean;
}

function HighlightErrors({ formikField, isRequired }: HighlightErrorsProps) {
    return (
        <>
            {isRequired ? (<div className='text-danger mt-2'>
                <ErrorMessage name={formikField} />
            </div>
            ) : null}
        </>
    );
}

export default HighlightErrors;