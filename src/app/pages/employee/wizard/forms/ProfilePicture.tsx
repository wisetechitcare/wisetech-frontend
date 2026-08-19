import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, Camera, X, Image, Eye } from 'lucide-react';
import PhotoEditorModal from './PhotoEditorModal';
import { alertDialog } from '@app/modules/common/components/ui';
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_LABEL,
  PHOTO_ACCEPT_MAP,
  PHOTO_HINT,
  validatePhotoFile,
} from '@utils/fileValidation';

interface ProfilePictureProps {
  setFile: (id: string, file: File) => void;
  avatar: string;
  /** Clear the photo in the parent (Formik avatar + any pending upload file). */
  onRemove?: () => void;
}



const ProfilePicture: React.FC<ProfilePictureProps> = ({ setFile, avatar, onRemove }) => {
  const [preview, setPreview] = useState<string | null>(avatar || null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showModal, setShowModal] = useState(false);

  /** Data URL handed to the editor. Null when the editor is closed. */
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);

  useEffect(() => {
    setPreview(avatar || null);
  }, [avatar]);

  /**
   * Vet the photo the moment it is picked, and say why if it is refused.
   *
   * This used to `return` silently on an oversized file and ignore dropzone
   * rejections entirely, so a bad photo simply did nothing — no editor, no message
   * — and the user found out at save time, if at all. Every rejection now names its
   * reason in a dialog before the editor opens.
   */
  const processFile = useCallback(async (file: File) => {
    const result = await validatePhotoFile(file);
    if (!result.ok) {
      await alertDialog({
        icon: 'error',
        title: 'This photo cannot be used',
        text: result.reason ?? 'Please choose a different image.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) setImageToEdit(reader.result.toString());
    };
    reader.onerror = () => {
      alertDialog({
        icon: 'error',
        title: 'This photo could not be read',
        text: 'The file may still be downloading or syncing. Please try again.',
      });
    };
    reader.readAsDataURL(file);
  }, []);

  /** The editor returns a finished JPEG; the parent only ever sees that. */
  const handleEditorApply = (edited: File) => {
    setFile('userProfilePicture', edited);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) setPreview(reader.result.toString());
    };
    reader.readAsDataURL(edited);
    setImageToEdit(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: PHOTO_ACCEPT_MAP,
    maxSize: MAX_PHOTO_BYTES,
    multiple: false,
    onDrop: (accepted, rejected) => {
      if (accepted[0]) {
        processFile(accepted[0]);
        return;
      }
      // Dropzone's own rejections were discarded, so dropping a PDF looked like
      // nothing happened at all. Translate its codes into the same dialog.
      const rejection = rejected[0];
      if (!rejection) return;
      const code = rejection.errors?.[0]?.code;
      alertDialog({
        icon: 'error',
        title: 'This photo cannot be used',
        text:
          code === 'file-too-large'
            ? `This image is larger than ${MAX_PHOTO_LABEL}. Please upload a smaller photo.`
            : code === 'file-invalid-type'
              ? `Only ${PHOTO_HINT.split(' · Max')[0]} images are accepted.`
              : 'Please choose a JPG, PNG or WEBP image.',
      });
    },
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
      {/* Wrapper keeps the circle from shrinking inside the flex column */}
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
              <p className="ob-dropzone-formats">{PHOTO_HINT}</p>
            </>
          )}
        </div>

      </div>

      {/* Photo actions live BELOW the circle, not floating on top of it — labelled
          buttons read as controls, whereas the old overlay dots read as decoration
          and clipped against the avatar's rounded edge. Only rendered with a photo. */}
      {hasPhoto && (
        <div className="ob-photo-actions">
          <button
            type="button"
            className="ob-photo-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
          <button
            type="button"
            className="ob-photo-action-btn ob-photo-action-btn--danger"
            onClick={removePhoto}
          >
            <X size={13} />
            <span>Remove</span>
          </button>
        </div>
      )}

      {/* Helper text below drop zone */}
      <div className="ob-photo-meta">
        <p className="ob-photo-meta-title">Profile Photo</p>
        <p className="ob-photo-meta-desc">
          A clear, professional photo. Recommended 400×400px or larger.
        </p>
      </div>

      {showModal && createPortal(
        <div className="ob-photo-view-modal" onClick={() => setShowModal(false)}>
          <div className="ob-photo-view-content" onClick={(e) => e.stopPropagation()}>
            <img src={preview!} alt="Profile Full View" />
            <button className="ob-photo-view-close" type="button" onClick={() => setShowModal(false)}>
              <X size={20} />
            </button>
          </div>
        </div>,
        document.body
      )}

      {imageToEdit && (
        <PhotoEditorModal
          src={imageToEdit}
          onCancel={() => setImageToEdit(null)}
          onApply={handleEditorApply}
        />
      )}
    </div>
  );
};

export default ProfilePicture;
