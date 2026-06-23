import React, { useEffect } from 'react';
import { C, FONT, RADIUS, BTN } from '@/app/modules/configuration/ConfigDesignSystem';
import { RestorePreview } from './types';
import { ChangeTypeChip, ValueDelta } from './parts';

interface Props {
  preview: RestorePreview;
  onClose: () => void;
  onConfirm?: () => void;
}

/** Design copy of the restore drawer (forward, audited rollback). */
export const RestoreDrawerView: React.FC<Props> = ({ preview, onClose, onConfirm }) => {
  const [reason, setReason] = React.useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)', zIndex: 1080, display: 'flex', justifyContent: 'flex-end' }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="ci-fade-in" style={{ width: 'min(560px, 100%)', height: '100%', backgroundColor: C.bgCard, boxShadow: C.shadowModal, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: FONT.heading, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>
              <i className="bi bi-arrow-counterclockwise" style={{ marginRight: 8, color: C.primary }} aria-hidden />
              {preview.targetRev === 0 ? 'Restore to original' : `Restore to revision ${preview.targetRev}`}
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              This is recorded as a new, reversible change — nothing is overwritten silently.
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ ...BTN.ghost, padding: 6, fontSize: 16 }}>
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.textSecondary, marginBottom: 14 }}>
            Restoring will change <strong style={{ color: C.textPrimary }}>{preview.restorableCount}</strong> field
            {preview.restorableCount === 1 ? '' : 's'} to their state at revision {preview.targetRev}. Current is R{preview.currentRev}.
          </div>

          {preview.skippedCount > 0 && (
            <div style={{ backgroundColor: C.warningLight, border: `1px solid ${C.warning}44`, borderRadius: RADIUS.md, padding: '10px 12px', marginBottom: 14, fontFamily: FONT.body, fontSize: 12, color: '#92400e' }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }} aria-hidden />
              {preview.skippedCount} field{preview.skippedCount === 1 ? '' : 's'} (collections / nested details) will <strong>not</strong> be restored — only scalar fields and key relationships.
            </div>
          )}

          {preview.changes.map((ch, i) => (
            <div key={`${ch.fieldName}-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}`, opacity: ch.restorable ? 1 : 0.55 }}>
              <div style={{ width: 150, flexShrink: 0 }}>
                <div style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 600, color: C.textPrimary }}>{ch.fieldLabel}</div>
                <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <ChangeTypeChip changeType={ch.changeType} />
                  {!ch.restorable && <span style={{ fontFamily: FONT.body, fontSize: 10, color: C.textMuted }}>not restored</span>}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}><ValueDelta change={ch} /></div>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <label style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 600, color: C.textSecondary, display: 'block', marginBottom: 6 }}>Reason (optional)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why are you restoring this?" style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: 13, color: C.textPrimary, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" style={{ ...BTN.secondary }} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...BTN.primary }} onClick={onConfirm}>
            <i className="bi bi-arrow-counterclockwise" aria-hidden /> Confirm restore
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreDrawerView;
