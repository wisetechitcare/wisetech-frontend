import TextInput from '@app/modules/common/inputs/TextInput';
import { KTIcon } from '@metronic/helpers';
import { IFaqs } from '@models/company';
import { createNewFaq, deleteFaqById, fetchAllFaqs, fetchCompanyOverview, updateFaqById } from '@services/company';
import { Form, Formik, FormikValues } from 'formik';
import { useEffect, useState } from 'react'
import * as Yup from 'yup';
import { Accordion, Button, Card, Modal } from 'react-bootstrap';
import { errorConfirmation, successConfirmation } from '@utils/modal';

const faqSchema = Yup.object({
    question: Yup.string().required().label('Question'),
    answer: Yup.string().required().label('Answer'),
    companyId: Yup.string(),
});

const Faqs = ({ fromAdmin = false, typeKey = '' }: { fromAdmin?: boolean, typeKey: string }) => {
    const [faqs, setFaqs] = useState<IFaqs[]>([]);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [show, setShow] = useState(false);
    const [faqId, setFaqId] = useState('');
    const [initialValues, setInitialValues] = useState({
        question: "",
        answer: "",
        companyId: "",
    });

    const handleClose = () => {
        setShow(false);
        setEditMode(false);
    }

    const handleEdit = (faq?: IFaqs) => {
        if (faq?.id !== undefined) {
            setEditMode(true);
            setFaqId(faq.id);
            setInitialValues({
                question: faq.question,
                answer: faq.answer,
                companyId: faq.companyId
            });
        } else {
            setInitialValues({
                answer: '',
                question: '',
                companyId: ''
            });
            setEditMode(false);
        }
        setShow(true);
    }

    const handleDelete = async (faq: IFaqs) => {
        try {
            await deleteFaqById(faq.id);
            successConfirmation('FAQ deleted successfully');
            fetchFaqData();
        } catch (e) {
            console.log(e);
        }
    }

    const handleSubmit = async (values: any, actions: FormikValues) => {
        try {
            setLoading(true);
            if (editMode) {
                await updateFaqById(faqId, values, typeKey);
                setLoading(false);
                successConfirmation('FAQ updated successfully');
                setShow(false);
                setEditMode(false);
                fetchFaqData();
                return;
            }

            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;
            // const payload = { ...values, companyId };
            const payload = {
                ...values,
                companyId,
                type: typeKey // Explicitly include type
            };
            await createNewFaq(payload);

            setLoading(false);
            successConfirmation('FAQ created successfully');
            setShow(false);
            fetchFaqData();
        } catch (err) {
            setLoading(false);
            console.error(err);
        }
    }

    const fetchFaqData = async () => {
        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;

            const { data: { faqs } } = await fetchAllFaqs(companyId, typeKey);
            setFaqs(faqs);
        } catch (err) {
            console.error("Error fetching FAQs:", err);
        }
    }

    useEffect(() => {
        fetchFaqData();
    }, [typeKey]);

    return (
        <>
            <Card style={{ height: '100%' }}>
                <Card.Body className="d-flex flex-column" style={{ height: '100%' }}>
                    <div className="flex-grow-1">
                        <h5 className="fw-bold">FAQs</h5>
                        {faqs.length === 0 ? (
                            <p className="text-muted">No FAQs available</p>
                        ) : (
                            <Accordion flush>
                                {faqs.map((faq: IFaqs, index: number) => (
                                    <Accordion.Item eventKey={index.toString()} key={index} style={{ padding: '0' }}>
                                        <Accordion.Header>
                                            {fromAdmin && (
                                                <div className="d-flex me-3">
                                                    <button
                                                        className="btn btn-icon btn-active-color-primary btn-sm me-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(faq);
                                                        }}
                                                        style={{ backgroundColor: 'transparent', border: 'none' }}>
                                                        <KTIcon iconName="pencil" className="fs-3" />
                                                    </button>
                                                    <button
                                                        className="btn btn-icon btn-active-color-danger btn-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(faq);
                                                        }}
                                                        style={{ backgroundColor: 'transparent', border: 'none' }}>
                                                        <KTIcon iconName="trash" className="fs-3" />
                                                    </button>
                                                </div>
                                            )}
                                            {faq.question}
                                        </Accordion.Header>
                                        <Accordion.Body>
                                            <ul>
                                                {faq.answer
                                                    .split(/[.*-]/)
                                                    .filter(Boolean)
                                                    .map((item, index) => (
                                                        <li key={index} style={{ textIndent: '0em', marginBottom: '1em' }}>
                                                            {item.trim()}.
                                                        </li>
                                                    ))}
                                            </ul>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                ))}
                            </Accordion>
                        )}
                    </div>
                    {fromAdmin && (
                        <div className="d-flex justify-content-start mt-3">
                            <Button
                                style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }}
                                onClick={() => handleEdit()}>
                                Add FAQ
                            </Button>
                        </div>
                    )}
                </Card.Body>
            </Card>

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editMode ? 'Edit FAQ' : 'Add FAQ'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik
                        initialValues={initialValues}
                        onSubmit={handleSubmit}
                        validationSchema={faqSchema}
                        enableReinitialize
                    >
                        {(formikProps) => (
                            <Form className='d-flex flex-column' noValidate id='faq_form' placeholder={''}>
                                <div className="col-lg">
                                    <TextInput
                                        isRequired={true}
                                        label="Question"
                                        margin="mb-7"
                                        formikField="question"
                                    />
                                </div>

                                <div className="col-lg">
                                    <TextInput
                                        isRequired={true}
                                        label="Answer"
                                        margin="mb-7"
                                        formikField="answer"
                                    />
                                </div>

                                <div className='d-flex justify-content-end'>
                                    <button
                                        type='button'
                                        className='btn btn-light me-3'
                                        onClick={handleClose}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type='submit'
                                        className='btn btn-primary'
                                        style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }}
                                        disabled={loading || !formikProps.isValid || !formikProps.dirty}
                                    >
                                        {!loading && (editMode ? 'Update' : 'Save')}
                                        {loading && (
                                            <span className='indicator-progress' style={{ display: 'block' }}>
                                                Please wait...{' '}
                                                <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </Modal.Body>
            </Modal>
        </>
    )
}

export default Faqs;