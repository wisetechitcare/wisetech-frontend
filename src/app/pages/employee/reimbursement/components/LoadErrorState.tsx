import { KTIcon } from '@metronic/helpers';

/**
 * Shown when a fetch failed.
 *
 * The module used to `catch { setRows([]) }` in seven places, which renders exactly like "you
 * have no expenses". A user cannot tell a failed request from an empty month, so a network blip
 * looked like data loss — the same confusion that produced the original ticket, arriving by a
 * different route.
 *
 * So this states plainly that loading failed, and offers the only useful action: try again.
 * It does not apologise, and it does not show a stack trace.
 */

interface LoadErrorStateProps {
    /** What could not be loaded, in the user's words: "your expenses", "payment history". */
    what: string;
    onRetry?: () => void;
}

export default function LoadErrorState({ what, onRetry }: LoadErrorStateProps) {
    return (
        <div
            role="alert"
            style={{
                padding: '2rem 1.5rem',
                borderRadius: '14px',
                backgroundColor: '#fef2f2',
                border: '1px dashed #fecaca',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    width: 38, height: 38, borderRadius: '11px', display: 'grid', placeItems: 'center',
                    color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                    margin: '0 auto 0.875rem',
                }}
                aria-hidden="true"
            >
                <KTIcon iconName="information-5" className="fs-4" />
            </div>

            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                Could not load {what}
            </p>
            <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.55 }}>
                This is a loading problem, not missing data — nothing has been deleted.
            </p>

            {onRetry && (
                <button type="button" className="btn btn-sm btn-light-danger" onClick={onRetry}>
                    Try again
                </button>
            )}
        </div>
    );
}
