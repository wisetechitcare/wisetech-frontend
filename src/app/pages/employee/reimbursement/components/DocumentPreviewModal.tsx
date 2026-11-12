import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '@/ds/ui/button';
import { FileText, LogOut, X } from 'lucide-react';

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
    /** The file's own name; otherwise the last part of the URL (a storage key) is shown. */
    title?: string;
    /** Keep the reader in the page: no "Open in tab" button and no new-tab fallback link. */
    inPageOnly?: boolean;
}

export default function DocumentPreviewModal({ url, onClose, title, inPageOnly = false }: DocumentPreviewModalProps) {
    // Query strings on presigned URLs would otherwise defeat the extension test.
    const cleanUrl = url.split('?')[0].toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp|bmp)$/.test(cleanUrl);
    const isPdf = cleanUrl.endsWith('.pdf');
    const filename = title || (url.split('/').pop()?.split('?')[0] ?? 'Document');

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
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/65 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Preview of ${filename}`}
        >
            {/* Fills a phone, stays a dialog on a desktop. The old fixed 95vw did neither. */}
            <div
                data-wt-control="container"
                className="flex h-[min(100%,710px)] w-[min(100%,900px)] flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                        <FileText className="size-[18px] shrink-0 text-primary" />
                        <span className="truncate">{filename}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {!inPageOnly && (
                            <Button
                                variant="outline"
                                size="sm"
                                // window.open rather than an anchor: keeps the button a button (and `noopener` explicit).
                                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                            >
                                <LogOut data-icon="inline-start" />
                                Open in tab
                            </Button>
                        )}
                        <Button
                            variant="tinted"
                            size="icon-sm"
                            className="[--tint:var(--cta-danger)]"
                            onClick={onClose}
                            // aria-label, not a tooltip: a tooltip would portal UNDER this overlay (z-index 99999),
                            // leaving a clipped "Esc)" showing past the dialog edge.
                            aria-label="Close preview (Esc)"
                        >
                            <X />
                        </Button>
                    </div>
                </div>

                <div className="flex min-h-0 grow items-center justify-center overflow-hidden bg-muted">
                    {isImage ? (
                        <img
                            src={url}
                            alt={`Receipt: ${filename}`}
                            className="max-h-full max-w-full object-contain p-4"
                        />
                    ) : isPdf ? (
                        <iframe src={url} title={`PDF preview: ${filename}`} className="size-full border-0" />
                    ) : (
                        <div className="flex size-full flex-col items-center gap-3 p-6 text-center">
                            <iframe
                                src={url}
                                title={`Preview: ${filename}`}
                                className="min-h-0 w-full flex-1 rounded-lg border-0"
                            />
                            {!inPageOnly && (
                                <p data-slot="preview-fallback" className="m-0 text-sm text-muted-foreground">
                                    If the document does not display,{' '}
                                    <a data-slot="preview-fallback-link" href={url} target="_blank" rel="noopener noreferrer" className="text-primary">
                                        open it in a new tab
                                    </a>.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
}
