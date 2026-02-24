import './FormHeading.css';

interface FormHeadingProps {
    headingText: string;
    padding: string;
    variant?: 'default' | 'decorated';
}

function FormHeading({ headingText, padding, variant = 'default' }: FormHeadingProps) {
    if (variant === 'decorated') {
        return (
            <div className={`${padding} d-flex align-items-center gap-3 w-100`} style={{ flexWrap: 'wrap' }}>
                <div className="form-heading-line" style={{
                    width: '26px',
                    height: '0px',
                    borderTop: '1px solid #9D4141',
                    flexShrink: 0
                }}></div>
                <p className="form-heading-decorated" style={{
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    color: '#9D4141',
                    textTransform: 'uppercase',
                    margin: 0,
                    flexShrink: 1,
                    minWidth: 0,
                    wordBreak: 'break-word'
                }}>
                    {headingText}
                </p>
                <div className="form-heading-line" style={{
                    flexGrow: 1,
                    height: '0px',
                    borderTop: '1px solid #9D4141',
                    minWidth: '40px'
                }}></div>
            </div>
        );
    }

    return (
        <div className={padding}>
            <h4 className='fw-bold text-uppercase employee__form_wizard__label'>{headingText}</h4>
        </div>
    );
}

export default FormHeading;