import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { C, FONT, RADIUS, BTN } from '@/app/modules/configuration/ConfigDesignSystem';
import { AuditEntityType } from './auditV2.service';
import { useResetPreview, useReset } from './hooks';

interface Props {
  type: AuditEntityType;
  id: string;
  targetVersion: number;
  onClose: () => void;
  onDone?: () => void;
}

/**
 * Reset confirmation — the destructive "Version History" action.
 * Permanently removes all versions after the target. Danger styling required.
 */
export const ResetModal: React.FC<Props> = ({ type, id, targetVersion, onClose, onDone }) => {
  const preview = useResetPreview(type, id, targetVersion);
  const reset = useReset(type, id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const resetError =
    (reset.error as { detail?: string; message?: string } | null)?.detail ??
    (reset.error as { detail?: string; message?: string } | null)?.message ??
    null;

  const handleConfirm = () => {
    reset.mutate(targetVersion, {
      onSuccess: (res) => {
        toast.success(`Record reset to Version ${res.newCurrentVersion}`);
        onDone?.();
        onClose();
      },
    });
  };

  const versionsToDelete = preview.data?.versionsToDelete ?? [];
  const changedFields = preview.data?.changes ?? [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,42,0.5)',
        zIndex: 1090,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="ci-fade-in"
        style={{
          width: 'min(520px, 100%)',
          maxHeight: '90vh',
          backgroundColor: C.bgCard,
          borderRadius: RADIUS.lg,
          boxShadow: C.shadowModal,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Danger header */}
        <div style={{ height: 4, backgroundColor: C.danger, flexShrink: 0 }} />
        <div style={{ padding: '18px 22px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: RADIUS.md,
                backgroundColor: C.dangerLight,
                color: C.danger,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden
            >
              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 16 }} />
            </div>
            <div style={{ fontFamily: FONT.heading, fontSize: 18, fontWeight: 700, color: C.textPrimary }}>
              Reset to Version {targetVersion}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 8px' }}>
          {preview.isLoading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
              <i className="bi bi-arrow-repeat ci-spin" style={{ fontSize: 20 }} aria-hidden /> Checking impact…
            </div>
          ) : preview.isError ? (
            <div style={{ padding: '20px 0', color: C.danger, fontFamily: FONT.body, fontSize: 13 }}>
              Couldn't compute the reset impact.
            </div>
          ) : preview.data ? (
            <>
              <p style={{ fontFamily: FONT.body, fontSize: 13.5, color: C.textSecondary, lineHeight: 1.5, marginBottom: 14 }}>
                This will <strong style={{ color: C.danger }}>permanently remove</strong> all versions after Version{' '}
                {targetVersion}. The record will look exactly as it did in Version {targetVersion}.
                <br />
                <strong>This action cannot be undone from the application.</strong>
              </p>

              {/* Versions to remove */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>
                  Versions to be removed ({versionsToDelete.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {versionsToDelete.map((v) => (
                    <span
                      key={v}
                      style={{
                        backgroundColor: C.dangerLight,
                        color: C.danger,
                        border: `1px solid ${C.danger}33`,
                        borderRadius: RADIUS.sm,
                        padding: '3px 9px',
                        fontFamily: FONT.body,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Version {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Fields that will change */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>
                  Fields that will change ({changedFields.length})
                </div>
                {changedFields.length === 0 ? (
                  <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: C.textMuted }}>No field values differ.</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {changedFields.map((c, i) => (
                      <li
                        key={`${c.fieldName}-${i}`}
                        style={{ fontFamily: FONT.body, fontSize: 13, color: C.textPrimary, marginBottom: 3, opacity: c.restorable ? 1 : 0.55 }}
                      >
                        {c.fieldLabel}
                        {!c.restorable && (
                          <span style={{ fontSize: 10.5, color: C.textMuted, marginLeft: 6 }}>(not reset)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {resetError && (
                <div
                  style={{
                    marginTop: 12,
                    backgroundColor: C.dangerLight,
                    border: `1px solid ${C.danger}44`,
                    borderRadius: RADIUS.md,
                    padding: '10px 12px',
                    fontFamily: FONT.body,
                    fontSize: 12.5,
                    color: '#9b1c44',
                  }}
                >
                  <i className="bi bi-exclamation-octagon-fill" style={{ marginRight: 6 }} aria-hidden />
                  {resetError}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" style={{ ...BTN.secondary }} onClick={onClose} disabled={reset.isPending}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={reset.isPending || !preview.data}
            style={{
              backgroundColor: C.danger,
              color: '#fff',
              border: 'none',
              borderRadius: RADIUS.md,
              padding: '10px 20px',
              fontFamily: FONT.body,
              fontWeight: 600,
              fontSize: 14,
              cursor: reset.isPending ? 'default' : 'pointer',
              opacity: reset.isPending || !preview.data ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {reset.isPending ? (
              <>
                <i className="bi bi-arrow-repeat ci-spin" aria-hidden /> Resetting…
              </>
            ) : (
              <>
                <i className="bi bi-arrow-counterclockwise" aria-hidden /> Reset Version
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetModal;
