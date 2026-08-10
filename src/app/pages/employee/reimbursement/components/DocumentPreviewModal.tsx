import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { KTIcon } from '@metronic/helpers';
import { WtButton, WtIconButton } from '@app/modules/common/components/ui/buttons';

/**
 * Receipt preview. The one copy.
 *
 * Four near-identical versions of this lived in the module (seven before Phase 1 deleted three
 * with their host files). They had already drifted: some trapped Escape, some did not; some
 * locked body scroll, some did not; the widths were set by a raw injected `<style>` tag at
 * `95vw`, which on a 360px phone is a 342px-wide data table.
 *
 * Sizing is now responsive by construction, and the dialog is keyboard-operable: Escape closes,
 * focus is visible, and every control carries a label rather than an icon alone.
 */

interface DocumentPreviewModalProps {
    /** Presigned URL. Receipts are private objects, so this expires — fetch it at open time. */
    url: string;
    onClose: () => void;
}

export default function DocumentPreviewModal({ url, onClose }: DocumentPreviewModalProps) {
    // Query strings on presigned URLs would otherwise defeat the extension test.
    const cleanUrl = url.split('?')[0].toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp|bmp)$/.test(cleanUrl);
    const isPdf = cleanUrl.endsWith('.pdf');
    const filename = url.split('/').pop()?.split('?')[0] ?? 'Document';

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const modalContent = (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 99999, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.65)', padding: '1rem',
            }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Preview of ${filename}`}
        >
            <div
                className="d-flex flex-column bg-white shadow overflow-hidden"
                style={{
                    // Fills a phone, stays a dialog on a desktop. The old fixed 95vw did neither.
                    width: 'min(100%, 900px)',
                    height: 'min(100%, 710px)',
                    borderRadius: '16px',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-light flex-shrink-0">
                    <div className="d-flex align-items-center gap-2 text-gray-700 fw-semibold fs-7 text-truncate">
                        <KTIcon iconName="document" className="fs-4 text-primary" />
                        <span className="text-truncate">{filename}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                        <WtButton
                            ghost
                            size="small"
                            // window.open rather than `component="a"`: WtButton is typed as a
                            // button, and an anchor's props do not fit through it.
                            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                            startIcon={<KTIcon iconName="exit-right-corner" className="fs-5" />}
                        >
                            Open in tab
                        </WtButton>
                        <WtIconButton
                            color="#dc2626"
                            onClick={onClose}
                            title="Close preview (Esc)"
                        >
                            <KTIcon iconName="cross" className="fs-2" />
                        </WtIconButton>
                    </div>
                </div>

                <div
                    className="flex-grow-1 overflow-hidden bg-light d-flex align-items-center justify-content-center"
                    style={{ minHeight: 0 }}
                >
                    {isImage ? (
                        <img
                            src={url}
                            alt={`Receipt: ${filename}`}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '1rem' }}
                        />
                    ) : isPdf ? (
                        <iframe src={url} title={`PDF preview: ${filename}`} style={{ width: '100%', height: '100%', border: 'none' }} />
                    ) : (
                        <div className="d-flex flex-column align-items-center gap-3 p-5 text-center w-100 h-100">
                            <iframe
                                src={url}
                                title={`Preview: ${filename}`}
                                style={{ width: '100%', flex: 1, border: 'none', borderRadius: 8, minHeight: 0 }}
                            />
                            <p className="text-muted fs-7 mb-0">
                                If the document does not display,{' '}
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary">
                                    open it in a new tab
                                </a>.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
}
