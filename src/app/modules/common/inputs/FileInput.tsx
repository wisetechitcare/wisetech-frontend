import { ChangeEvent, useRef, useState } from "react";
import ObFileUpload from "@pages/employee/wizard/components/ObFileUpload";
import { DOCUMENT_ACCEPT, DOCUMENT_HINT, validateDocumentFile } from "@utils/fileValidation";
import { Button } from '@/ds/ui/button';
import { SmartAvatar } from '@/ds/ui/smart-avatar';
// Direct file import, not the `ui` barrel — pulling the barrel in drags the whole kit into the
// program and is a known tsc blow-up in this repo.
import { pressableProps } from '@app/modules/common/components/ui/a11y';

interface FileInputProps {
    placeholder: string;
    documentId: string;
    hidden?: boolean;
    path?: string;
    setFile: (documentId: string, file: File) => void;
    /** Clear the attachment. Fired by the upload field's X — without it the X was inert. */
    onRemove?: () => void;
    existingDocument?: any;
    fieldName?: string;
    disabled?: boolean;
    onDisabledClick?: () => void;
    /** Use onboarding wizard upload styling */
    onboardingStyle?: boolean;
    /** `hidden` (avatar preview) mode: whose photo it is, for the initials fallback and its accessible name. */
    avatarName?: string;
    /** `hidden` mode: stable colour key for the initials tile (the employee id). */
    avatarSeed?: string | number;
}

function FileInput({
    placeholder,
    documentId,
    setFile,
    onRemove,
    hidden,
    path,
    existingDocument,
    fieldName,
    disabled = false,
    onDisabledClick,
    onboardingStyle = false,
    avatarName,
    avatarSeed,
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
        // The avatar preview: the photo when there is one, else the person's initials.
        //
        // The avatar IS the file picker here, which makes it the same kind of control as the wizard's
        // `dropzone` (ProfilePicture, ObFileUpload — the branch just below renders that one): a surface
        // that opens a file dialog, not an ordinary action button. It was a bare `<span onClick>`, so it
        // had no keyboard path at all; `pressableProps` is the shared helper that gives it the role,
        // tab stop and Enter/Space the native element would have given for free.
        return (
            <span data-wt-control="dropzone"
                {...pressableProps(handleFileClick, disabled)}
                aria-label={`Change photo for ${avatarName || placeholder}`}
                className={`inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={handleFileClick}
            >
                <SmartAvatar name={avatarName || placeholder} src={path} seed={avatarSeed} size={125} />
            </span>
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
                    onChange={(file) => (file ? setFile(documentId, file) : onRemove?.())}
                />
            </div>
        );
    }

    return (
        <>
            <div data-wt-control="container"
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
                        <Button size="sm"
                            type="button"
                            onClick={() => window.open(existingDocument.path, '_blank')}
                            disabled={disabled}
                        >
                            View
                        </Button>
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
