interface IdentifiersProps {
    text?: string;
    cssClass: string;
}

function Identifiers({ text, cssClass }: IdentifiersProps) {
    return (
        <div className="d-flex align-items-center">
            <div className={`circle ${cssClass} d-inline-block`}></div>
            {text && <div className="mx-2">{text}</div>}
        </div>
    );
}

export default Identifiers;