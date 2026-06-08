import { IFaqs } from '@models/company';
import { createNewFaq, deleteFaqById, fetchAllFaqs, fetchCompanyOverview, updateFaqById } from '@services/company';
import { useEffect, useState, useCallback } from 'react';
import { Card } from 'react-bootstrap';
import { deleteConfirmation, errorConfirmation, successConfirmation } from '@utils/modal';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import FaqItem from './FaqItem';
import FaqModal from './FaqModal';
import FaqSection from './FaqSection';
import { FormikValues } from 'formik';
import { useEventBus } from '@hooks/useEventBus';
import eventBus from '@utils/EventBus';

interface FaqsBySection {
    [key: string]: IFaqs[];
}

const AttendanceAdminFaqs = () => {
    const [faqsBySection, setFaqsBySection] = useState<FaqsBySection>({});
    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [faqId, setFaqId] = useState('');
    const [initialValues, setInitialValues] = useState({
        question: "",
        answer: "",
        companyId: "",
        type: "",
    });

    const handleClose = () => {
        setShow(false);
        setEditMode(false);
        setInitialValues({
            question: "",
            answer: "",
            companyId: "",
            type: "",
        });
    };

    const handleEdit = (faq?: IFaqs) => {
        if (faq?.id !== undefined) {
            setEditMode(true);
            setFaqId(faq.id);
            const editValues = {
                question: faq.question,
                answer: faq.answer,
                companyId: faq.companyId,
                type: faq.type || ""
            };
            console.log('Edit mode - FAQ type:', faq.type);
            console.log('Edit mode - Initial values:', editValues);
            setInitialValues(editValues);
        } else {
            setEditMode(false);
            setInitialValues({
                question: "",
                answer: "",
                companyId: "",
                type: "",
            });
        }
        setShow(true);
    };

    const handleDelete = async (faq: IFaqs) => {
        const result = await deleteConfirmation('Deleted Successfully');

        if (result) {
            try {
                await deleteFaqById(faq.id);
                // successConfirmation('FAQ deleted successfully');
                // Emit event for immediate UI update
                eventBus.emit('faqDeleted', { id: faq.id });
            } catch (e) {
                console.log(e);
                errorConfirmation('Failed to delete FAQ');
            }
        }
    };

    const handleSubmit = async (values: any, actions: FormikValues) => {
        try {
            setLoading(true);
            if (editMode) {
                await updateFaqById(faqId, values, values.type);
                setLoading(false);
                successConfirmation('FAQ updated successfully');
                handleClose();
                // Emit event for immediate UI update
                eventBus.emit('faqUpdated', { id: faqId });
                return;
            }

            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;
            const payload = {
                ...values,
                companyId
            };
            const response = await createNewFaq(payload);
            setLoading(false);
            successConfirmation('FAQ created successfully');
            handleClose();
            // Emit event for immediate UI update
            eventBus.emit('faqCreated', { id: response?.data?.id || 'new' });
        } catch (err) {
            setLoading(false);
            errorConfirmation('Failed to save FAQ');
            console.error(err);
        }
    };

    const fetchFaqs = useCallback(async () => {
        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;
            // Fetch all FAQ types by not passing the type parameter
            const response = await fetchAllFaqs(companyId);
            console.log('FAQ API Response:', response);

            // API returns sections, organize FAQs by section type
            const sections = response?.data?.sections || [];
            const groupedFaqs: FaqsBySection = {
                attendance: [],
                leaves: [],
                salary: [],
                reimbursement: [],
                general_rules: []
            };

            sections.forEach((section: any) => {
                const sectionId = section.id;
                if (groupedFaqs.hasOwnProperty(sectionId)) {
                    const sectionFaqs = (section.faqs || []).map((faq: IFaqs) => ({
                        ...faq,
                        type: faq.type || sectionId
                    }));
                    // Sort FAQs alphabetically by question
                    groupedFaqs[sectionId] = sectionFaqs.sort((a: IFaqs, b: IFaqs) =>
                        a.question.localeCompare(b.question)
                    );
                }
            });

            console.log('Grouped FAQ Data:', groupedFaqs);
            setFaqsBySection(groupedFaqs);
        } catch (error) {
            console.log('Error fetching FAQs:', error);
            setFaqsBySection({
                attendance: [],
                leaves: [],
                salary: [],
                reimbursement: [],
                general_rules: []
            });
        }
    }, []);

    // Listen to FAQ events for immediate UI updates
    useEventBus('faqCreated', fetchFaqs);
    useEventBus('faqUpdated', fetchFaqs);
    useEventBus('faqDeleted', fetchFaqs);

    useEffect(() => {
        fetchFaqs();
    }, [fetchFaqs]);

    return (
        <div style={{ backgroundColor: '#f7f9fc', height: '100%', padding: '0px' }}>
            <div className="d-flex flex-column gap-4">
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center">
                    <h2 className="fw-semibold mb-0" style={{ fontSize: '24px', letterSpacing: '0.24px' }}>
                        Frequently Asked Questions
                    </h2>
                    {/* {hasPermission(resourceNameMapWithCamelCase.attendance, permissionConstToUseWithHasPermission.create) && ( */}
                        <button
                            className="btn"
                            style={{
                                backgroundColor: '#9d4141',
                                color: 'white',
                                borderRadius: '6px',
                                padding: '0 32px',
                                height: '40px',
                                fontSize: '14px',
                                fontWeight: 500
                            }}
                            onClick={() => handleEdit()}
                        >
                            Add New
                        </button>
                    {/* )} */}
                </div>

                {/* FAQ Sections */}
                <div className="d-flex flex-column gap-3">
                    {Object.entries({
                        attendance: 'Attendance',
                        leaves: 'Leaves',
                        salary: 'Salary',
                        reimbursement: 'Reimbursement',
                        general_rules: 'General Rules'
                    }).map(([sectionId, sectionTitle]) => {
                        const sectionFaqs = faqsBySection[sectionId] || [];

                        return (
                            <FaqSection key={sectionId} title={sectionTitle}>
                                {sectionFaqs.length > 0 ? (
                                    sectionFaqs.map((faq: IFaqs, index: number) => (
                                        <FaqItem
                                            key={faq.id}
                                            faq={faq}
                                            isLast={index === sectionFaqs.length - 1}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center text-muted py-3">
                                        No FAQs available for this section
                                    </div>
                                )}
                            </FaqSection>
                        );
                    })}
                </div>
            </div>

            {/* FAQ Modal */}
            <FaqModal
                show={show}
                editMode={editMode}
                initialValues={initialValues}
                loading={loading}
                onClose={handleClose}
                onSubmit={handleSubmit}
            />
        </div>
    );
};

export default AttendanceAdminFaqs;
