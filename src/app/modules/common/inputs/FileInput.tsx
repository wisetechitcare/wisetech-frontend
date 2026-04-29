import { ChangeEvent, useRef } from "react";

interface FileInputProps {
    placeholder: string;
    documentId: string;
    hidden?: boolean;
    path?: string;
    setFile: (documentId: string, file: File) => void;
    existingDocument?: any;
    fieldName?: string;
    disabled?: boolean;
    onDisabledClick?: () => void;
}

function FileInput({ placeholder, documentId, setFile, hidden, path, existingDocument, fieldName, disabled = false, onDisabledClick }: FileInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const { target: { files } } = event;
        if (files && files.length > 0) {
            const file = files[0];
            setFile(documentId, file);
        }
    }

    const handleFileClick = () => {
        if (fileInputRef.current && !disabled) {
            fileInputRef.current.click();
        }
    }

    const handleWrapperClick = () => {
        if (disabled && onDisabledClick) {
            onDisabledClick();
        }
    }

    return (
        <>
            <div
                onClick={handleWrapperClick}
                style={{
                    cursor: disabled ? 'not-allowed' : 'auto',
                }}
            >
                <div className="d-flex gap-2 align-items-center">
                    <input
                        type='file'
                        className={`form-control form-control-lg form-control-solid ${hidden ? 'd-none' : ''}`}
                        placeholder={placeholder}
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        disabled={disabled}
                        style={{ pointerEvents: disabled ? 'none' : 'auto' }}
                        title={disabled ? "Please save user details first" : ""}
                    />

                    {/* Show View button if document exists */}
                    {existingDocument && existingDocument.path && !hidden && (
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => window.open(existingDocument.path, '_blank')}
                            disabled={disabled}
                        >
                            View
                        </button>
                    )}
                </div>
            </div>
            {hidden && <img
                className='rounded-circle object-fit-contain image-input-wrapper w-125px h-125px position-relative'
                src={path}
                onClick={handleFileClick} />}
        </>
    );
}

export default FileInput;
