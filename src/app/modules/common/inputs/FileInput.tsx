import { ChangeEvent, useRef, useState } from "react";
import ObFileUpload from "@pages/employee/wizard/components/ObFileUpload";
import { DOCUMENT_ACCEPT, DOCUMENT_HINT, validateDocumentFile } from "@utils/fileValidation";

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
    // Only used by the plain (non-onboarding) branch; ObFileUpload renders its own.
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const { target: { files } } = event;
        if (!files || files.length === 0) return;

        const file = files[0];
        // This branch accepted ANY file of ANY size and passed it straight to the
        // uploader — the type and size rules only ever existed on the onboarding path.
        const validationError = validateDocumentFile(file);
        if (validationError) {
            setError(validationError);
            // Reset so re-picking the same file after fixing it still fires `change`.
            event.target.value = "";
            return;
        }

        setError(null);
        setFile(documentId, file);
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
                    accept={DOCUMENT_ACCEPT}
                    hint={DOCUMENT_HINT}
                    existingFileName={existingDocument?.fileName || existingDocument?.path?.split("/").pop()}
                    existingFileUrl={existingDocument?.path}
                    onDisabledClick={onDisabledClick}
                    onChange={(file) => {
                        if (file) setFile(documentId, file);
                    }}
                />
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
                        accept={DOCUMENT_ACCEPT}
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        disabled={disabled}
                        style={{ pointerEvents: disabled ? 'none' : 'auto' }}
                        title={disabled ? "Please save user details first" : ""}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${documentId}-file-error` : undefined}
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
                {/* role="alert" so a screen reader announces the rejection — the visual
                    cue alone leaves the picker looking like it simply did nothing. */}
                {error ? (
                    <div id={`${documentId}-file-error`} role="alert" className="text-danger mt-1" style={{ fontSize: "0.8125rem" }}>
                        {error}
                    </div>
                ) : (
                    <div className="text-muted mt-1" style={{ fontSize: "0.75rem" }}>{DOCUMENT_HINT}</div>
                )}
            </div>
        </>
    );
}

export default FileInput;
