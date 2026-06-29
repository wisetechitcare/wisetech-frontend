import React from 'react';
import { C, FONT, RADIUS } from '@/app/modules/configuration/ConfigDesignSystem';
import { V2ChangeSet } from './auditV2.service';
import { CategoryBadge, ChangeTypeChip, ValueDelta } from './parts';
import { initials, displayActor, actorKind, humanizeSummary } from './tokens';
import { fromNow, fullDateTime } from './time';

interface Props {
  cs: V2ChangeSet;
  expanded: boolean;
  onToggle: () => void;
  onCompare: (revisionNumber: number) => void;
  /** Admin-only: reset the record to this version. Omitted → no reset action. */
  onReset?: (revisionNumber: number) => void;
}

const actionBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: 'transparent',
  borderRadius: RADIUS.md,
  padding: '6px 13px',
  fontFamily: FONT.body,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 0.15s ease',
  ...extra,
});

export const ChangeSetCard: React.FC<Props> = ({ cs, expanded, onToggle, onCompare, onReset }) => {
  const changes = cs.changes ?? [];
  const kind = actorKind({
    first: cs.changedByFirstName,
    last: cs.changedByLastName,
    changeSource: cs.changeSource,
    summary: cs.summary,
  });
  const isSystem = kind === 'system';
  const actorName = displayActor(cs.changedByFirstName, cs.changedByLastName);
  const summary = humanizeSummary(cs);

  return (
    <div
      className="ci-card ci-fade-in"
      style={{
        border: `1px solid ${expanded ? `${C.primary}55` : C.border}`,
        borderRadius: RADIUS.lg,
        backgroundColor: C.bgCard,
        overflow: 'hidden',
        boxShadow: expanded ? C.shadowCard : C.shadowSm,
        transition: 'box-shadow .2s ease, border-color .2s ease',
      }}
    >
      {/* Header — clickable to expand */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: '100%',
          textAlign: 'left',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: '13px 15px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        {/* Avatar — initials for people, gear for the system */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: RADIUS.md,
            backgroundColor: isSystem ? C.bgSection : C.primaryLight,
            color: isSystem ? C.textMuted : C.primary,
            border: `1px solid ${isSystem ? C.border : `${C.primary}22`}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontFamily: FONT.heading,
            fontWeight: 700,
            fontSize: 13.5,
          }}
          aria-hidden
        >
          {isSystem ? (
            <i className="bi bi-gear-fill" style={{ fontSize: 15 }} />
          ) : (
            initials(cs.changedByFirstName, cs.changedByLastName)
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT.body, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>
              {actorName}
            </span>
            {isSystem && (
              <span
                style={{
                  fontFamily: FONT.body,
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: C.textMuted,
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.sm,
                  padding: '1px 6px',
                }}
              >
                Automated
              </span>
            )}
            <span
              style={{
                fontFamily: FONT.body,
                fontSize: 10.5,
                fontWeight: 700,
                color: C.primary,
                backgroundColor: C.primaryLight,
                padding: '2px 8px',
                borderRadius: RADIUS.full,
                letterSpacing: '0.3px',
              }}
            >
              R{cs.revisionNumber}
            </span>
            <CategoryBadge category={cs.category} />
            <span
              title={fullDateTime(cs.changedAt)}
              style={{
                fontFamily: FONT.body,
                fontSize: 11.5,
                color: C.textMuted,
                marginLeft: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {fromNow(cs.changedAt)}
            </span>
          </div>

          <div
            style={{
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 500,
              color: C.textSecondary,
              marginTop: 5,
              lineHeight: 1.4,
            }}
          >
            {summary}
          </div>

          {!expanded && changes.length > 0 && (
            <div
              style={{
                fontFamily: FONT.body,
                fontSize: 11.5,
                color: C.textMuted,
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <i className="bi bi-card-list" style={{ fontSize: 11 }} aria-hidden />
              {changes.length} field{changes.length === 1 ? '' : 's'} changed · click to view
            </div>
          )}
        </div>

        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
            backgroundColor: expanded ? C.primaryLight : 'transparent',
            color: expanded ? C.primary : C.textMuted,
            transition: 'background-color .2s ease, color .2s ease',
          }}
          aria-hidden
        >
          <i
            className="bi bi-chevron-down"
            style={{
              fontSize: 12,
              transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </span>
      </button>

      {/* Expanded body — field changes + provenance + actions (height-animated) */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows .28s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div
            style={{
              padding: '2px 15px 14px 65px',
              opacity: expanded ? 1 : 0,
              transform: expanded ? 'translateY(0)' : 'translateY(-4px)',
              transition: 'opacity .22s ease .04s, transform .22s ease .04s',
            }}
          >
            <div
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS.md,
              overflow: 'hidden',
              backgroundColor: C.bgCard,
            }}
          >
            {changes.length === 0 ? (
              <div
                style={{
                  padding: '14px',
                  fontFamily: FONT.body,
                  fontSize: 12.5,
                  color: C.textMuted,
                  textAlign: 'center',
                }}
              >
                No field-level detail recorded for this entry.
              </div>
            ) : (
              changes.map((ch, i) => (
                <div
                  key={ch.id ?? `${ch.fieldName}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '11px 13px',
                    borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                    backgroundColor: i % 2 === 1 ? C.bgSection : 'transparent',
                  }}
                >
                  <div style={{ width: 138, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 600, color: C.textPrimary }}>
                        {ch.fieldLabel}
                      </span>
                      {ch.isSensitive && (
                        <i
                          className="bi bi-shield-lock-fill"
                          style={{ fontSize: 10, color: C.purple }}
                          title="Sensitive field — value redacted"
                        />
                      )}
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <ChangeTypeChip changeType={ch.changeType} />
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                    <ValueDelta change={ch} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Provenance chips (Source / Device / Browser / IP) and the Verified
              badge were removed from the UI per request. The hash chain
              (prevHash/rowHash) is still computed and stored server-side. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 12,
            }}
          >
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {onReset && (
                <button
                  type="button"
                  onClick={() => onReset(cs.revisionNumber)}
                  style={actionBtn({ color: C.danger, border: `1px solid ${C.danger}55` })}
                  title="Reset the record to this version (deletes newer versions)"
                >
                  <i className="bi bi-arrow-counterclockwise" style={{ fontSize: 12 }} aria-hidden />
                  Reset to here
                </button>
              )}
              <button
                type="button"
                onClick={() => onCompare(cs.revisionNumber)}
                style={actionBtn({ color: C.primary, border: `1px solid ${C.primary}` })}
              >
                <i className="bi bi-file-earmark-diff" style={{ fontSize: 12 }} aria-hidden />
                View this change
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeSetCard;
