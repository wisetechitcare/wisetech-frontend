import TextInput from '@app/modules/common/inputs/TextInput';
import { IFaqs } from '@models/company';
import { createNewFaq, deleteFaqById, fetchAllFaqs, fetchCompanyOverview, updateFaqById } from '@services/company';
import { Field, Form, Formik, FormikValues } from 'formik';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { Button, Modal } from 'react-bootstrap';
import { deleteConfirmation, successConfirmation } from '@utils/modal';
import FaqSection from '../../../../adminFaqs/FaqSection';
import FaqItem from '../../../../adminFaqs/FaqItem';
import HighlightErrors from '@app/modules/errors/components/HighlightErrors';

const faqSchema = Yup.object({
    question: Yup.string().required().label('Question'),
    answer: Yup.string().required().label('Answer'),
    companyId: Yup.string(),
});

const SECTION_TITLES: Record<string, string> = {
    attendance: 'Attendance',
    leaves: 'Leaves',
    salary: 'Salary',
    reimbursement: 'Reimbursement',
    general_rules: 'General Rules',
    loan: 'Loans',
};

const Faqs = ({ fromAdmin = false, typeKey = '' }: { fromAdmin?: boolean; typeKey: string }) => {
    const [faqs, setFaqs] = useState<IFaqs[]>([]);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [show, setShow] = useState(false);
    const [faqId, setFaqId] = useState('');
    const [initialValues, setInitialValues] = useState({ question: '', answer: '', companyId: '' });

    const handleClose = () => { setShow(false); setEditMode(false); };

    const handleEdit = (faq?: IFaqs) => {
        if (faq?.id !== undefined) {
            setEditMode(true);
            setFaqId(faq.id);
            setInitialValues({ question: faq.question, answer: faq.answer, companyId: faq.companyId });
        } else {
            setInitialValues({ answer: '', question: '', companyId: '' });
            setEditMode(false);
        }
        setShow(true);
    };

    const handleDelete = async (faq: IFaqs) => {
        const sure = await deleteConfirmation('FAQ deleted successfully');
        if (!sure) return;
        try {
            await deleteFaqById(faq.id);
            successConfirmation('FAQ deleted successfully');
            fetchFaqData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (values: any, _actions: FormikValues) => {
        try {
            setLoading(true);
            if (editMode) {
                await updateFaqById(faqId, values, typeKey);
                successConfirmation('FAQ updated successfully');
                setShow(false);
                setEditMode(false);
                fetchFaqData();
                setLoading(false);
                return;
            }
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;
            await createNewFaq({ ...values, companyId, type: typeKey });
            successConfirmation('FAQ created successfully');
            setShow(false);
            fetchFaqData();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFaqData = async () => {
        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;
            const { data: { faqs } } = await fetchAllFaqs(companyId, typeKey);
            setFaqs(faqs);
        } catch (err) {
            console.error('Error fetching FAQs:', err);
        }
    };

    useEffect(() => { fetchFaqData(); }, [typeKey]);

    const sectionTitle = SECTION_TITLES[typeKey] || (typeKey ? typeKey.charAt(0).toUpperCase() + typeKey.slice(1) : 'FAQs');

    return (
        <>
            <FaqSection title={sectionTitle} badge={faqs.length}>
                {faqs.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>No FAQs available for this section.</p>
                ) : (
                    faqs.map((faq, index) => (
                        <FaqItem
                            key={faq.id || index}
                            faq={faq}
                            isLast={index === faqs.length - 1}
                            onEdit={fromAdmin ? handleEdit : undefined}
                            onDelete={fromAdmin ? handleDelete : undefined}
                        />
                    ))
                )}

                {fromAdmin && (
                    <div style={{ marginTop: faqs.length > 0 ? '16px' : '0' }}>
                        <button
                            type="button"
                            onClick={() => handleEdit()}
                            style={{
                                background: '#9d4141',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '7px',
                                padding: '7px 18px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            + Add FAQ
                        </button>
                    </div>
                )}
            </FaqSection>

            {/* Add / Edit Modal */}
            <Modal show={show} onHide={handleClose} centered size="lg">
                <Modal.Header closeButton style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 24px' }}>
                    <Modal.Title style={{ fontSize: '16px', fontWeight: 700 }}>
                        {editMode ? 'Edit FAQ' : 'Add FAQ'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '24px' }}>
                    <Formik
                        initialValues={initialValues}
                        onSubmit={handleSubmit}
                        validationSchema={faqSchema}
                        enableReinitialize
                    >
                        {(formikProps) => (
                            <Form className="d-flex flex-column" style={{ gap: '16px' }} noValidate>
                                <TextInput isRequired label="Question" margin="mb-0" formikField="question" />

                                <div className="d-flex flex-column fv-row">
                                    <label className="d-flex align-items-center fs-6 form-label mb-2">
                                        <span className="required">Answer</span>
                                    </label>
                                    <Field
                                        as="textarea"
                                        name="answer"
                                        rows={6}
                                        placeholder="Enter answer…"
                                        className="form-control"
                                        style={{ resize: 'vertical', minHeight: '120px' }}
                                    />
                                    <HighlightErrors isRequired formikField="answer" />
                                </div>

                                <div className="d-flex justify-content-end gap-2">
                                    <button type="button" className="btn btn-light" onClick={handleClose}>
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn"
                                        style={{ background: '#9d4141', color: '#fff', border: 'none' }}
                                        disabled={loading || !formikProps.isValid || !formikProps.dirty}
                                    >
                                        {loading ? (
                                            <span>
                                                Please wait…{' '}
                                                <span className="spinner-border spinner-border-sm align-middle ms-2" />
                                            </span>
                                        ) : editMode ? 'Update' : 'Save'}
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default Faqs;
