import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Upload, FileText, X, Eye } from "lucide-react";

type ObFileUploadProps = {
  onChange: (file: File | null) => void;
  disabled?: boolean;
  accept?: string;
  hint?: string;
  existingFileName?: string;
  /** URL of an already-saved document, used to preview when no new file is picked */
  existingFileUrl?: string;
  onDisabledClick?: () => void;
  id?: string;
};

function ObFileUpload({
  onChange,
  disabled = false,
  accept = ".pdf,.jpg,.jpeg,.png",
  hint = "PDF, JPG or PNG",
  existingFileName,
  existingFileUrl,
  onDisabledClick,
  id,
}: ObFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayName = selectedName || existingFileName || null;
  // Prefer the freshly-picked file's blob URL; fall back to the saved document URL.
  const viewUrl = previewUrl || existingFileUrl || null;

  // Revoke the object URL on change/unmount to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedName(file?.name ?? null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    onChange(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    setSelectedName(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onChange(null);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewUrl) window.open(viewUrl, "_blank", "noopener,noreferrer");
  };

  const openPicker = () => {
    if (disabled) {
      onDisabledClick?.();
      return;
    }
    inputRef.current?.click();
  };

  return (
    <div
      className={`ob-file-upload${disabled ? " is-disabled" : ""}${displayName ? " has-file" : ""}`}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="ob-file-upload-input"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        tabIndex={-1}
        aria-hidden
      />
      <div className="ob-file-upload-icon" aria-hidden>
        {displayName ? <FileText size={18} /> : <Upload size={18} />}
      </div>
      <div className="ob-file-upload-text">
        <span className="ob-file-upload-label">
          {displayName ? displayName : "Choose a file"}
        </span>
        <span className="ob-file-upload-hint">
          {displayName ? "Tap to replace" : hint}
        </span>
      </div>
      {viewUrl && (
        <button
          type="button"
          className="ob-file-upload-view"
          onClick={handleView}
          aria-label="View uploaded file"
          title="View uploaded file"
        >
          <Eye size={14} />
          <span>View</span>
        </button>
      )}
      <span className="ob-file-upload-action">
        {displayName ? "Change" : "Browse"}
      </span>
      {displayName && !disabled && (
        <button
          type="button"
          className="ob-file-upload-clear"
          onClick={handleClear}
          aria-label="Remove file"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default ObFileUpload;
