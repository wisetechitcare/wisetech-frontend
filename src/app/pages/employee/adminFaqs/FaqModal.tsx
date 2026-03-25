import { IFaqs } from '@models/company';
import { Field, Form, Formik, FormikValues } from 'formik';
import { Modal } from 'react-bootstrap';
import * as Yup from 'yup';
import TextInput from '@app/modules/common/inputs/TextInput';
import DropDownInput from '@app/modules/common/inputs/DropdownInput';
import HighlightErrors from '@app/modules/errors/components/HighlightErrors';

const FAQ_TYPE_OPTIONS = [
    { value: 'attendance', label: 'Attendance' },
    { value: 'leaves', label: 'Leaves' },
    { value: 'salary', label: 'Salary' },
    { value: 'reimbursement', label: 'Reimbursement' },
    { value: 'general_rules', label: 'General Rules' },
];

interface FaqModalProps {
    show: boolean;
    editMode: boolean;
    initialValues: {
        question: string;
        answer: string;
        companyId: string;
        type: string;
    };
    loading: boolean;
    onClose: () => void;
    onSubmit: (values: any, actions: FormikValues) => Promise<void>;
}

const faqSchema = Yup.object({
    type: Yup.string()
        .required('Type is required')
        .oneOf(['attendance', 'leaves', 'salary', 'reimbursement', 'general_rules'], 'FAQ type must be one of: attendance, leaves, salary, reimbursement, general_rules')
        .label('Type'),
    question: Yup.string().required('Question is required').label('Question'),
    answer: Yup.string()
        .required('Answer is required')
        .label('Answer'),
    companyId: Yup.string(),
});

const FaqModal = ({ show, editMode, initialValues, loading, onClose, onSubmit }: FaqModalProps) => {
    return (
        <Modal show={show} onHide={onClose} centered size="lg">
            <Modal.Body style={{ padding: '40px 44px' }}>
                <Formik
                    initialValues={initialValues}
                    onSubmit={onSubmit}
                    validationSchema={faqSchema}
                    enableReinitialize
                >
                    {(formikProps) => (
                        <Form className='d-flex flex-column' style={{ gap:'20px' }} noValidate placeholder={''}>
                            <h2
                                className="fw-semibold mb-0"
                                style={{ fontSize: '24px', letterSpacing: '0.24px' }}
                            >
                                {editMode ? 'Edit Question And Answer' : 'Add New Question And Answer'}
                            </h2>

                            <div className="d-flex flex-column" style={{  }}>
                                {/* Type Field */}
                                <DropDownInput
                                    formikField="type"
                                    inputLabel="Type"
                                    options={FAQ_TYPE_OPTIONS}
                                    isRequired={true}
                                    placeholder="Select type"
                                />

                                {/* Question Field */}
                                <TextInput
                                    formikField="question"
                                    label="Question"
                                    isRequired={true}
                                    placeholder="What are casual leaves?"
                                />

                                {/* Answer Field */}
                                <div className="d-flex flex-column fv-row">
                                    <label className='d-flex align-items-center fs-6 form-label mb-2'>
                                        <span className='required'>Answer</span>
                                    </label>
                                    <Field
                                        as="textarea"
                                        name="answer"
                                        rows={6}
                                        placeholder="Enter your answer here..."
                                        className="employee__form_wizard__input form-control"
                                        style={{
                                            height: '170px',
                                            resize: 'none'
                                        }}
                                    />
                                    <HighlightErrors isRequired={true} formikField="answer" />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="d-flex" style={{ gap: '12px' }}>
                                <button
                                    type='submit'
                                    className='btn'
                                    style={{
                                        backgroundColor: '#9d4141',
                                        color: 'white',
                                        borderRadius: '6px',
                                        padding: '0 20px',
                                        height: '40px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        border: 'none'
                                    }}
                                    disabled={loading || !formikProps.isValid}
                                >
                                    {!loading && 'Save'}
                                    {loading && (
                                        <span className='indicator-progress' style={{ display: 'block' }}>
                                            Please wait...{' '}
                                            <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                        </span>
                                    )}
                                </button>
                                <button
                                    type='button'
                                    className='btn'
                                    onClick={onClose}
                                    style={{
                                        backgroundColor: 'white',
                                        color: '#9d4141',
                                        borderRadius: '6px',
                                        padding: '0 20px',
                                        height: '40px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        border: '1px solid #9d4141'
                                    }}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Modal.Body>
        </Modal>
    );
};

export default FaqModal;
