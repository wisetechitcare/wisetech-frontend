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

// Neutral slate palette for the error surface — intentionally not the pink
// semantic danger token, which reads too loud for a full-page failure state.
const SLATE = {
  dark: '#1e293b',
  mid: '#334155',
  red: '#b91c1c',
  redBg: '#fdf6f6',
};

const EXTRA_KEYFRAMES = `
  @keyframes errFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .err-card { animation: errFadeUp 0.35s ease; }
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
            borderRadius: RADIUS.lg,
            border: `1px solid ${C.border}`,
            boxShadow: '0 8px 32px rgba(24,28,50,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Header strip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: SP.md,
            padding: `${SP.lg} ${SP.xl}`,
            borderBottom: `1px solid ${C.border}`,
            backgroundColor: C.bgSection,
          }}>
            <div
              style={{
                width: 44, height: 44,
                borderRadius: RADIUS.md,
                background: `linear-gradient(135deg, ${SLATE.dark} 0%, ${SLATE.mid} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <i className="bi bi-exclamation-triangle" style={{ fontSize: 20, color: '#fff' }} />
            </div>
            <div>
              <h3 style={{
                fontFamily: FONT.heading,
                fontWeight: 700, fontSize: 19,
                color: C.textPrimary,
                letterSpacing: '-0.3px',
                margin: 0, lineHeight: 1.25,
              }}>
                Something went wrong on this page
              </h3>
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: C.textSecondary,
              }}>
                Application Error
              </span>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: `${SP.lg} ${SP.xl}` }}>

            {/* Description */}
            <p style={{
              fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6,
              margin: `0 0 ${SP.lg} 0`, fontWeight: 400,
            }}>
              An unexpected error stopped this page from loading. The rest of the
              application is unaffected — you can go back or reload this page.
            </p>

            {/* Error message box */}
            {error && (
              <div style={{
                backgroundColor: SLATE.redBg,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${SLATE.red}`,
                borderRadius: RADIUS.md,
                padding: SP.md,
                marginBottom: SP.md,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: SLATE.mid,
                  textTransform: 'uppercase', letterSpacing: '0.6px',
                  marginBottom: 6,
                }}>
                  Error details
                </div>
                <pre style={{
                  fontSize: 12.5, color: SLATE.red,
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
                  {showStack ? 'Hide' : 'Show'} technical details
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
                style={{ ...BTN.primary, padding: '9px 20px' }}
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
