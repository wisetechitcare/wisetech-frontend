import { KTIcon } from '@metronic/helpers';
import { IFaqs } from '@models/company';

interface FaqItemProps {
    faq: IFaqs;
    isLast?: boolean;
    onEdit: (faq: IFaqs) => void;
    onDelete: (faq: IFaqs) => void;
}

const FaqItem = ({ faq, isLast = false, onEdit, onDelete }: FaqItemProps) => {
    return (
        <>
            <div className="d-flex justify-content-between align-items-start gap-4">
                <div className="flex-grow-1 d-flex flex-column gap-2">
                    <div className="fw-semibold text-dark" style={{ fontSize: '14px' }}>
                        {faq.question}
                    </div>
                    <div className="text-muted" style={{ fontSize: '14px', lineHeight: '1.56' }}>
                        {faq.answer}
                    </div>
                </div>
                <div className="d-flex gap-2 flex-shrink-0">
                    <button
                        className="btn btn-icon btn-sm p-0"
                        onClick={() => onEdit(faq)}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            width: '20px',
                            height: '20px',
                            color: '#9d4141'
                        }}
                        title="Edit"
                    >
                        <KTIcon iconName="pencil" className="fs-4"/>
                    </button>
                    <button
                        className="btn btn-icon btn-sm p-0"
                        onClick={() => onDelete(faq)}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            width: '20px',
                            height: '20px',
                            color: '#9d4141'
                        }}
                        title="Delete"
                    >
                        <KTIcon iconName="trash" className="fs-4" />
                    </button>
                </div>
            </div>
            {!isLast && (
                <hr style={{ borderColor: '#ced3da', margin: '20px 0' }} />
            )}
        </>
    );
};

export default FaqItem;
