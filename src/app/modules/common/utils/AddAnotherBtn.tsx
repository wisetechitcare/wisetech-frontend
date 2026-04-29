import { KTIcon } from "@metronic/helpers";

interface AddAnotherBtnProps {
    onClick: () => void;
}

function AddAnotherBtn({ onClick }: AddAnotherBtnProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                width: '100%',
                height: '39px',
                border: '1px dashed #9399A6',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontWeight: 500,
                fontSize: '14px',
                color: '#9D4141',
                padding: '7px 0',
            }}
        >
            Add another
        </button>
    );
}

export default AddAnotherBtn;