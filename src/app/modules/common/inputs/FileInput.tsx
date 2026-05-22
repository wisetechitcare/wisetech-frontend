import { ChangeEvent, useRef } from "react";
import ObFileUpload from "@pages/employee/wizard/components/ObFileUpload";

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
    /** Use onboarding wizard upload styling */
    onboardingStyle?: boolean;
}

function FileInput({
    placeholder,
    documentId,
    setFile,
    hidden,
    path,
    existingDocument,
    fieldName,
    disabled = false,
    onDisabledClick,
    onboardingStyle = false,
}: FileInputProps) {
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

    if (hidden) {
        return (
            <img
                className='rounded-circle object-fit-contain image-input-wrapper w-125px h-125px position-relative'
                src={path}
                onClick={handleFileClick}
                alt={placeholder}
            />
        );
    }

    if (onboardingStyle) {
        return (
            <div className="ob-file-upload-wrap">
                <ObFileUpload
                    disabled={disabled}
                    accept=".pdf"
                    hint="PDF only — max 10MB"
                    existingFileName={existingDocument?.fileName || existingDocument?.path?.split("/").pop()}
                    onDisabledClick={onDisabledClick}
                    onChange={(file) => {
                        if (file) setFile(documentId, file);
                    }}
                />
                {existingDocument?.path && (
                    <button
                        type="button"
                        className="ob-file-upload-view-btn"
                        onClick={() => window.open(existingDocument.path, "_blank")}
                        disabled={disabled}
                    >
                        View uploaded file
                    </button>
                )}
            </div>
        );
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

                    {existingDocument && existingDocument.path && (
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
        </>
    );
}

export default FileInput;
