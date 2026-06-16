import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Camera, X, Image } from 'lucide-react';

interface ProfilePictureProps {
  setFile: (id: string, file: File) => void;
  avatar: string;
  /** Clear the photo in the parent (Formik avatar + any pending upload file). */
  onRemove?: () => void;
}

const ACCEPTED_FORMATS = { 'image/jpeg': [], 'image/png': [], 'image/webp': [] };
const MAX_SIZE_MB = 5;

const ProfilePicture: React.FC<ProfilePictureProps> = ({ setFile, avatar, onRemove }) => {
  const [preview, setPreview] = useState<string | null>(avatar || null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setPreview(avatar || null);
  }, [avatar]);

  const processFile = useCallback((file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return;
    setFile('userProfilePicture', file);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) setPreview(reader.result.toString());
    };
    reader.readAsDataURL(file);
  }, [setFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_FORMATS,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: false,
    onDrop: (accepted) => { if (accepted[0]) processFile(accepted[0]); },
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    onDropAccepted: () => setIsDragOver(false),
    onDropRejected: () => setIsDragOver(false),
  });

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    // Propagate the removal so the saved avatar URL and any pending upload are cleared.
    onRemove?.();
  };

  const hasPhoto = Boolean(preview);

  return (
    <div className="ob-photo-section ob-photo-section--vertical">
      {/* Drop zone wrapped so remove button can sit outside the clipped circle */}
      <div className="ob-dropzone-wrapper">
        <div
          {...getRootProps()}
          className={`ob-dropzone ${isDragActive || isDragOver ? 'drag-over' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Upload profile photo"
        >
          <input {...getInputProps()} />

          {hasPhoto ? (
            <div className="ob-dropzone-preview">
              <img src={preview!} alt="Profile preview" />
              <div className="ob-dropzone-preview-overlay">
                <Camera size={16} />
                <span>Change photo</span>
              </div>
            </div>
          ) : (
            <>
              <div className="ob-dropzone-icon">
                {isDragActive ? <Upload size={28} /> : <Image size={28} />}
              </div>
              <p className="ob-dropzone-hint">
                {isDragActive ? 'Drop to upload' : 'Drag & drop or click'}
              </p>
              <p className="ob-dropzone-formats">JPG · PNG · WEBP · Max {MAX_SIZE_MB}MB</p>
            </>
          )}
        </div>

        {hasPhoto && (
          <button
            type="button"
            className="ob-photo-remove-btn"
            onClick={removePhoto}
            aria-label="Remove photo"
          >
            <X size={12} />
          </button>
        )}
      </div>
      
      {/* Helper text below drop zone */}
      <div className="ob-photo-meta">
        <p className="ob-photo-meta-title">Profile Photo</p>
        <p className="ob-photo-meta-desc">
          A clear, professional photo. Recommended 400×400px or larger.
        </p>
      </div>
    </div>
  );
};

export default ProfilePicture;
