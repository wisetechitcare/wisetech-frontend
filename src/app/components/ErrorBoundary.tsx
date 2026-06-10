import React from 'react';
import { C, FONT, SP, RADIUS, BTN, KEYFRAMES } from '../modules/configuration/ConfigDesignSystem';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
  showStack: boolean;
}

const EXTRA_KEYFRAMES = `
  @keyframes errFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes errPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(241,65,108,0.25); }
    50%       { box-shadow: 0 0 0 10px rgba(241,65,108,0); }
  }
  .err-card   { animation: errFadeUp 0.35s ease; }
  .err-icon   { animation: errPulse 2.2s ease-in-out infinite; }
`;

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: '', showStack: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, componentStack: '' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Page crashed (caught by ErrorBoundary):', error, info?.componentStack);
    this.setState({ componentStack: info?.componentStack || '' });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, componentStack, showStack } = this.state;
    const stackLines = componentStack.split('\n').filter(Boolean).slice(0, 6);

    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: SP.xl,
          backgroundColor: C.bgPage,
          fontFamily: FONT.body,
        }}
      >
        <style>{KEYFRAMES}{EXTRA_KEYFRAMES}</style>

        <div
          className="err-card"
          style={{
            width: '100%',
            maxWidth: 540,
            backgroundColor: C.bgCard,
            borderRadius: RADIUS.xl,
            border: `1px solid ${C.border}`,
            boxShadow: '0 8px 32px rgba(24,28,50,0.10)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Top accent bar */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '3px',
            background: `linear-gradient(90deg, ${C.danger} 0%, #e0395f 50%, #f97398 100%)`,
          }} />

          {/* Card body */}
          <div style={{ padding: `${SP.xl} ${SP.xl} ${SP.lg} ${SP.xl}`, paddingTop: '36px' }}>

            {/* Icon + Badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: SP.md, marginBottom: SP.lg }}>
              <div
                className="err-icon"
                style={{
                  width: 52, height: 52,
                  borderRadius: RADIUS.lg,
                  background: `linear-gradient(135deg, ${C.danger} 0%, #e0395f 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 24, color: '#fff' }} />
              </div>
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  backgroundColor: C.dangerLight,
                  color: C.danger,
                  borderRadius: RADIUS.full,
                  fontSize: 11, fontWeight: 700,
                  padding: '3px 10px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: C.danger, display: 'inline-block' }} />
                  Runtime Error
                </span>
                <h3 style={{
                  fontFamily: FONT.heading,
                  fontWeight: 700, fontSize: 20,
                  color: C.textPrimary,
                  letterSpacing: '-0.3px',
                  margin: 0, lineHeight: 1.2,
                }}>
                  Something went wrong on this page
                </h3>
              </div>
            </div>

            {/* Description */}
            <p style={{
              fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6,
              margin: `0 0 ${SP.lg} 0`, fontWeight: 400,
            }}>
              An unexpected error stopped this page from loading. The rest of the app is
              still working — you can go back or reload.
            </p>

            {/* Error message box */}
            {error && (
              <div style={{
                backgroundColor: C.dangerLight,
                border: `1px solid rgba(241,65,108,0.18)`,
                borderRadius: RADIUS.lg,
                padding: SP.md,
                marginBottom: SP.md,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginBottom: 6,
                }}>
                  <i className="bi bi-bug-fill" style={{ fontSize: 12, color: C.danger }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.danger, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Error message
                  </span>
                </div>
                <pre style={{
                  fontSize: 12.5, color: '#c0304f',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  margin: 0, fontFamily: "'Fira Code', 'Consolas', monospace",
                  lineHeight: 1.6,
                }}>
                  {error.message}
                </pre>
              </div>
            )}

            {/* Stack trace toggle */}
            {stackLines.length > 0 && (
              <div style={{ marginBottom: SP.lg }}>
                <button
                  type="button"
                  onClick={() => this.setState(s => ({ showStack: !s.showStack }))}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    color: C.textMuted, fontSize: 12, fontFamily: FONT.body,
                    padding: 0, marginBottom: showStack ? 8 : 0,
                    transition: 'color 0.15s',
                  }}
                >
                  <i className={`bi bi-chevron-${showStack ? 'up' : 'down'}`} style={{ fontSize: 11 }} />
                  {showStack ? 'Hide' : 'Show'} stack trace
                </button>

                {showStack && (
                  <pre style={{
                    fontSize: 11.5, color: C.textSecondary,
                    backgroundColor: C.bgSection,
                    border: `1px solid ${C.border}`,
                    borderRadius: RADIUS.md,
                    padding: SP.md,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    maxHeight: 180, overflow: 'auto',
                    margin: 0,
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    lineHeight: 1.65,
                  }}>
                    {stackLines.join('\n')}
                  </pre>
                )}
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: C.border, margin: `0 0 ${SP.lg} 0` }} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: SP.md, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => window.history.back()}
                style={{ ...BTN.secondary, padding: '9px 20px' }}
              >
                <i className="bi bi-arrow-left" style={{ fontSize: 13 }} />
                Go back
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ ...BTN.primary, padding: '9px 20px', backgroundColor: C.danger, boxShadow: '0 4px 12px rgba(241,65,108,0.25)', borderColor: 'transparent' } as React.CSSProperties}
              >
                <i className="bi bi-arrow-clockwise" style={{ fontSize: 13 }} />
                Reload page
              </button>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <p style={{ marginTop: SP.lg, fontSize: 12, color: C.textMuted, textAlign: 'center' }}>
          If this keeps happening, please contact your system administrator.
        </p>
      </div>
    );
  }
}

export default ErrorBoundary;
