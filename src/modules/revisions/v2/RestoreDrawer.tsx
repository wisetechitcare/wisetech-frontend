import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { C, FONT, RADIUS, BTN } from '@/app/modules/configuration/ConfigDesignSystem';
import { AuditEntityType } from './auditV2.service';
import { useRestorePreview, useRestore } from './hooks';
import { ChangeTypeChip, ValueDelta } from './parts';

interface Props {
  type: AuditEntityType;
  id: string;
  targetRev: number;
  onClose: () => void;
  onRestored?: () => void;
}

export const RestoreDrawer: React.FC<Props> = ({ type, id, targetRev, onClose, onRestored }) => {
  const preview = useRestorePreview(type, id, targetRev);
  const restore = useRestore(type, id);
  const [reason, setReason] = React.useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const restoreError =
    (restore.error as { detail?: string; message?: string } | null)?.detail ??
    (restore.error as { detail?: string; message?: string } | null)?.message ??
    null;

  const handleConfirm = () => {
    if (!preview.data) return;
    restore.mutate(
      { targetRev, reason: reason.trim() || undefined, expectedCurrentRev: preview.data.currentRev },
      {
        onSuccess: (res) => {
          toast.success(`Restored to revision ${res.restoredFrom}`);
          onRestored?.();
          onClose();
        },
      },
    );
  };

  const restorableCount = preview.data?.restorableCount ?? 0;
  const skippedCount = preview.data?.skippedCount ?? 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,42,0.45)',
        zIndex: 1080,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Restore to revision ${targetRev}`}
        onClick={(e) => e.stopPropagation()}
        className="ci-fade-in"
        style={{
          width: 'min(560px, 100%)',
          height: '100%',
          backgroundColor: C.bgCard,
          boxShadow: C.shadowModal,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontFamily: FONT.heading, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>
              <i className="bi bi-arrow-counterclockwise" style={{ marginRight: 8, color: C.primary }} aria-hidden />
              {targetRev === 0 ? 'Restore to original' : `Restore to revision ${targetRev}`}
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              This is recorded as a new, reversible change — nothing is overwritten silently.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ ...BTN.ghost, padding: 6, fontSize: 16 }}
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {preview.isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
              <i className="bi bi-arrow-repeat ci-spin" style={{ fontSize: 22 }} aria-hidden /> Computing impact…
            </div>
          ) : preview.isError ? (
            <div style={{ color: C.danger, fontFamily: FONT.body, fontSize: 13, padding: '20px 0' }}>
              Couldn't compute the restore impact.
            </div>
          ) : preview.data ? (
            <>
              <div
                style={{
                  fontFamily: FONT.body,
                  fontSize: 13,
                  color: C.textSecondary,
                  marginBottom: 14,
                }}
              >
                Restoring will change <strong style={{ color: C.textPrimary }}>{restorableCount}</strong> field
                {restorableCount === 1 ? '' : 's'}{' '}
                {targetRev === 0 ? 'to their original values' : `to their state at revision ${targetRev}`}. Current is R
                {preview.data.currentRev}.
              </div>

              {skippedCount > 0 && (
                <div
                  style={{
                    backgroundColor: C.warningLight,
                    border: `1px solid ${C.warning}44`,
                    borderRadius: RADIUS.md,
                    padding: '10px 12px',
                    marginBottom: 14,
                    fontFamily: FONT.body,
                    fontSize: 12,
                    color: '#92400e',
                  }}
                >
                  <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }} aria-hidden />
                  {skippedCount} field{skippedCount === 1 ? '' : 's'} (collections / nested details) will <strong>not</strong>{' '}
                  be restored in this version — only scalar fields and key relationships.
                </div>
              )}

              {preview.data.changes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
                  This entity already matches revision {targetRev} — nothing to restore.
                </div>
              ) : (
                preview.data.changes.map((ch, i) => (
                  <div
                    key={`${ch.fieldName}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 0',
                      borderBottom: `1px solid ${C.border}`,
                      opacity: ch.restorable ? 1 : 0.55,
                    }}
                  >
                    <div style={{ width: 150, flexShrink: 0 }}>
                      <div style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 600, color: C.textPrimary }}>
                        {ch.fieldLabel}
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <ChangeTypeChip changeType={ch.changeType} />
                        {!ch.restorable && (
                          <span style={{ fontFamily: FONT.body, fontSize: 10, color: C.textMuted }}>not restored</span>
                        )}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                      <ValueDelta change={ch} />
                    </div>
                  </div>
                ))
              )}

              {/* Reason */}
              <div style={{ marginTop: 16 }}>
                <label style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 6 }}>
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Why are you restoring this?"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: `1px solid ${C.border}`,
                    borderRadius: RADIUS.md,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    color: C.textPrimary,
                    resize: 'vertical',
                  }}
                />
              </div>

              {restoreError && (
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
                  {restoreError}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button type="button" style={{ ...BTN.secondary }} onClick={onClose} disabled={restore.isPending}>
            Cancel
          </button>
          <button
            type="button"
            style={{ ...BTN.primary, opacity: restorableCount === 0 || restore.isPending ? 0.6 : 1 }}
            onClick={handleConfirm}
            disabled={restorableCount === 0 || restore.isPending || !preview.data}
          >
            {restore.isPending ? (
              <>
                <i className="bi bi-arrow-repeat ci-spin" aria-hidden /> Restoring…
              </>
            ) : (
              <>
                <i className="bi bi-arrow-counterclockwise" aria-hidden /> Confirm restore
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreDrawer;
