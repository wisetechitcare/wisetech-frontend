import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, Camera, X, Image, Eye } from 'lucide-react';
import Cropper from 'react-easy-crop';

interface ProfilePictureProps {
  setFile: (id: string, file: File) => void;
  avatar: string;
  /** Clear the photo in the parent (Formik avatar + any pending upload file). */
  onRemove?: () => void;
}

const ACCEPTED_FORMATS = { 'image/jpeg': [], 'image/png': [], 'image/webp': [] };
const MAX_SIZE_MB = 5;

/**
 * Cuts the chosen region out of the source image, LOSSLESSLY.
 *
 * PNG, not JPEG, on purpose. This used to emit JPEG at quality 0.95, which meant a
 * profile photo was compressed twice — once here and again when the server re-encodes
 * it to WebP — and generational loss compounds. Handing over lossless pixels leaves
 * exactly one lossy encode in the whole pipeline, on the server, where it is tuned.
 *
 * The crop is also drawn 1:1 (`canvas` is sized to the crop rectangle in the source
 * image's own pixels), so nothing is resampled here either. Downscaling is left to
 * sharp, whose Lanczos filter is visibly better than canvas bilinear.
 *
 * The cost is a bigger request — a few MB rather than a few hundred KB — which is
 * paid once, on a screen where the user is already waiting for a save.
 */
const getCroppedImg = (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No 2D context'));
        return;
      }
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    };
    image.onerror = (err) => reject(err);
  });
};

const ProfilePicture: React.FC<ProfilePictureProps> = ({ setFile, avatar, onRemove }) => {
  const [preview, setPreview] = useState<string | null>(avatar || null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Crop states
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    setPreview(avatar || null);
  }, [avatar]);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const processFile = useCallback((file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return;
    setCurrentFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setImageToCrop(reader.result.toString());
        setShowCropper(true);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCropApply = async () => {
    if (!imageToCrop || !croppedAreaPixels || !currentFile) return;
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      // getCroppedImg always emits PNG, so the name and MIME must say PNG too. The
      // upload middleware gates on the declared extension and type, and a file whose
      // label disagrees with its bytes is exactly the shape the server treats as
      // suspicious — no reason for our own client to look like that.
      const croppedFile = new File(
        [croppedBlob],
        `${currentFile.name.replace(/\.[^.]+$/, '')}.png`,
        { type: 'image/png' }
      );
      setFile('userProfilePicture', croppedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) setPreview(reader.result.toString());
      };
      reader.readAsDataURL(croppedFile);
      
      setShowCropper(false);
      setImageToCrop(null);
      setCurrentFile(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    } catch (e) {
      console.error('Error cropping image:', e);
    }
  };

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
              <p className="ob-dropzone-formats">JPG · PNG · WEBP · Max {MAX_SIZE_MB}MB</p>
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

      {showCropper && imageToCrop && createPortal(
        <div className="ob-crop-modal ob-wizard-root">
          <div className="ob-crop-dialog">
            <div className="ob-crop-area">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="ob-crop-controls">
              <div className="ob-crop-zoom-slider">
                <span>Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-label="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </div>
              <div className="ob-crop-actions">
                <button
                  type="button"
                  className="ob-crop-btn ob-crop-btn--cancel"
                  onClick={() => {
                    setShowCropper(false);
                    setImageToCrop(null);
                    setCurrentFile(null);
                    setZoom(1);
                    setCrop({ x: 0, y: 0 });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ob-crop-btn ob-crop-btn--apply"
                  onClick={handleCropApply}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProfilePicture;
