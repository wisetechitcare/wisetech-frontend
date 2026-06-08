import TextInput from '@app/modules/common/inputs/TextInput';
import { KTIcon } from '@metronic/helpers';
import { IFaqs } from '@models/company';
import { createNewFaq, deleteFaqById, fetchAllFaqs, fetchCompanyOverview, updateFaqById } from '@services/company';
import { Form, Formik, FormikValues } from 'formik';
import { useEffect, useState } from 'react'
import * as Yup from 'yup';
import { Accordion, Button, Card, Modal } from 'react-bootstrap';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { LOAN_KEY } from '@constants/configurations-key';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';

const faqSchema = Yup.object({
    question: Yup.string().required().label('Question'),
    answer: Yup.string().required().label('Answer'),
    companyId: Yup.string(),
});

let initialState = {
    question: "",
    answer: "",
    companyId: "",
};

const Faqs = ({ fromAdmin = false }: { fromAdmin?: boolean }) => {
    const [faqs, setFaqs] = useState<IFaqs[]>([]);

    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [show, setShow] = useState(false);

    const [faqId, setFaqId] = useState('');

    const handleClose = () => {
        setShow(false);
        setEditMode(false);
    }

    const handleEdit = (faq?: IFaqs) => {
        setShow(true);
        if (faq?.id !== undefined) {
            setEditMode(true);
            setFaqId(faq.id);
            initialState = {
                question: faq.question,
                answer: faq.answer,
                companyId: faq.companyId
            };
        } else {
            initialState = {
                answer: '',
                question: '',
                companyId: ''
            };
            setEditMode(false);
        }
    }

    const handleDelete = async (faq: IFaqs) => {
        try {
            await deleteFaqById(faq.id);
            successConfirmation('FAQ deleted successfully');
            fetchFaqs();
        } catch (e) {
            console.log(e);
        }
    }

    const handleSubmit = async (values: any, actions: FormikValues) => {
        try {
            setLoading(true);
            if (editMode) {
                await updateFaqById(faqId, values, LOAN_KEY);
                setLoading(false);
                successConfirmation('FAQ updated successfully');
                setShow(false);
                setEditMode(false);
                fetchFaqs();
                return;
            }
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;
            const payload = { 
                ...values, 
                companyId,
                type: LOAN_KEY // Explicitly include type
            };
            await createNewFaq(payload);
            setLoading(false);
            successConfirmation('FAQ created successfully');
            setShow(false);
            fetchFaqs();
        } catch (err) {
            setLoading(false);
        }
    }

    async function fetchFaqs() {
        const { data: { companyOverview } } = await fetchCompanyOverview();
        const companyId = companyOverview[0].id;

        const { data: { faqs } } = await fetchAllFaqs(companyId, LOAN_KEY);
        const filteredFaqs = faqs.filter((faq: IFaqs) => faq.type === LOAN_KEY);
        setFaqs(filteredFaqs);
    }

    useEffect(() => {
        fetchFaqs();
    }, []);

    return (
        <>
            <Card style={{ height: '100%' }}>
               {/* {hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.readOthers) ?  */}
               
               <Card.Body className="d-flex flex-column" style={{ height: '100%' }}>
                    <div className="flex-grow-1">
                        <h5 className="fw-bold">FAQs</h5>
                        <Accordion flush>
                            {faqs.map((faq: IFaqs, index: number) => (
                                <Accordion.Item eventKey={index.toString()} key={index} style={{ padding: '0' }}>
                                    <Accordion.Header>
                                        {fromAdmin && hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.editOthers) && (
                                            <button
                                                className="btn btn-icon btn-active-color-primary btn-sm pr-0"
                                                onClick={() => handleEdit(faq)}
                                                style={{ backgroundColor: 'transparent', border: 'none' }}>
                                                <KTIcon iconName="pencil" className="fs-3" />
                                            </button>
                                        )}
                                        {fromAdmin && hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.editOthers) &&
                                            <button
                                                className="btn btn-icon btn-active-color-primary btn-sm pr-0"
                                                onClick={() => handleDelete(faq)}
                                                style={{ backgroundColor: 'transparent', border: 'none' }}>
                                                <KTIcon iconName="trash" className="fs-3" />
                                            </button>}
                                        {faq.question}
                                    </Accordion.Header>
                                    <Accordion.Body>{faq.answer}</Accordion.Body>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </div>
                    {hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.readOthers) && hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.create) && <div className="d-flex justify-content-start mt-3">
                        <Button style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }}
                            onClick={() => handleEdit()}>Add FAQs</Button>
                    </div>}
                </Card.Body> 
                {/* : <h2 className="text-center my-5">Not Allowed</h2>} */}
            </Card>

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>FAQs</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={faqSchema} enableReinitialize>
                        {(formikProps) => {
                            return (
                                <Form className='d-flex flex-column' noValidate id='employee_onboarding_form' placeholder={undefined}>
                                    <div className="col-lg">
                                        <TextInput
                                            isRequired={true}
                                            label="Question"
                                            margin="mb-7"
                                            formikField="question" />
                                    </div>

                                    <div className="col-lg">
                                        <TextInput
                                            isRequired={true}
                                            label="Answer"
                                            margin="mb-7"
                                            formikField="answer" />
                                    </div>

                                    <div className='d-flex justify-content-end'>
                                        <button type='submit' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={loading || !formikProps.isValid}>
                                            {!loading && 'Save Changes'}
                                            {loading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            )
                        }}
                    </Formik>
                </Modal.Body>
            </Modal >
        </>
    )
}

export default Faqs;
