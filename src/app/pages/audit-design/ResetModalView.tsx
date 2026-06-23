import React, { useEffect } from 'react';
import { C, FONT, RADIUS, BTN } from '@/app/modules/configuration/ConfigDesignSystem';
import { ResetPreview } from './types';

interface Props {
  preview: ResetPreview;
  onClose: () => void;
  onConfirm?: () => void;
}

/** Design copy of the hard-reset confirmation modal (danger styling). */
export const ResetModalView: React.FC<Props> = ({ preview, onClose, onConfirm }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', zIndex: 1090, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="ci-fade-in" style={{ width: 'min(520px, 100%)', maxHeight: '90vh', backgroundColor: C.bgCard, borderRadius: RADIUS.lg, boxShadow: C.shadowModal, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 4, backgroundColor: C.danger, flexShrink: 0 }} />
        <div style={{ padding: '18px 22px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: C.dangerLight, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-hidden>
              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 16 }} />
            </div>
            <div style={{ fontFamily: FONT.heading, fontSize: 18, fontWeight: 700, color: C.textPrimary }}>
              Reset to Version {preview.targetVersion}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 8px' }}>
          <p style={{ fontFamily: FONT.body, fontSize: 13.5, color: C.textSecondary, lineHeight: 1.5, marginBottom: 14 }}>
            This will <strong style={{ color: C.danger }}>permanently remove</strong> all versions after Version {preview.targetVersion}. The record will look exactly as it did in Version {preview.targetVersion}.
            <br />
            <strong>This action cannot be undone from the application.</strong>
          </p>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>
              Versions to be removed ({preview.versionsToDelete.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {preview.versionsToDelete.map((v) => (
                <span key={v} style={{ backgroundColor: C.dangerLight, color: C.danger, border: `1px solid ${C.danger}33`, borderRadius: RADIUS.sm, padding: '3px 9px', fontFamily: FONT.body, fontSize: 12, fontWeight: 600 }}>
                  Version {v}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>
              Fields that will change ({preview.changes.length})
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {preview.changes.map((c, i) => (
                <li key={`${c.fieldName}-${i}`} style={{ fontFamily: FONT.body, fontSize: 13, color: C.textPrimary, marginBottom: 3, opacity: c.restorable ? 1 : 0.55 }}>
                  {c.fieldLabel}
                  {!c.restorable && <span style={{ fontSize: 10.5, color: C.textMuted, marginLeft: 6 }}>(not reset)</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" style={{ ...BTN.secondary }} onClick={onClose}>Cancel</button>
          <button type="button" onClick={onConfirm} style={{ backgroundColor: C.danger, color: '#fff', border: 'none', borderRadius: RADIUS.md, padding: '10px 20px', fontFamily: FONT.body, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="bi bi-arrow-counterclockwise" aria-hidden /> Reset Version
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetModalView;
