import React from 'react';
import { C, FONT, SP, RADIUS, BTN, KEYFRAMES } from '../modules/configuration/ConfigDesignSystem';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
  showStack: boolean;
  /** Short code shown to the user and logged with the report, so a support call can find it. */
  reference: string;
  reported: boolean;
}

/**
 * A short, sayable reference for one crash.
 *
 * Not an id from anywhere — a user reading it down a phone line is the entire use case, so it is
 * six characters with no lookalikes rather than a UUID nobody will transcribe correctly.
 */
function makeReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no I/O/0/1
  let out = '';
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
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
  state: State = {
    hasError: false, error: null, componentStack: '', showStack: false,
    reference: '', reported: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, componentStack: '', reference: makeReference() };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Page crashed (caught by ErrorBoundary):', error, info?.componentStack);
    this.setState({ componentStack: info?.componentStack || '' });
    this.report(error, info?.componentStack || '');
  }

  /**
   * Send the crash to the server.
   *
   * A crash that only reaches the user's own console is not reported — nobody who could fix it
   * ever learns it happened, which is how a page stays broken for weeks. Fire-and-forget on
   * purpose: a failure to report must never turn one crash into two.
   */
  private report(error: Error, componentStack: string) {
    if (this.state.reported) return;
    this.setState({ reported: true });
    try {
      const body = JSON.stringify({
        reference: this.state.reference,
        message: String(error?.message ?? '').slice(0, 500),
        stack: String(error?.stack ?? '').slice(0, 4000),
        componentStack: componentStack.slice(0, 2000),
        path: window.location.pathname,
        userAgent: navigator.userAgent.slice(0, 200),
      });
      // `keepalive` so the report survives the user immediately navigating away, which is
      // exactly what people do when a page breaks.
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive: true,
        body,
      }).catch(() => undefined);
    } catch {
      // See above.
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, componentStack, showStack, reference } = this.state;

    // Production used to `return null` here — a literal blank page. The crash was invisible to
    // the user (who saw an empty screen and assumed the app had hung) and invisible to us
    // (nothing was reported anywhere). Users still must not see a stack trace, so production
    // gets the same shell with the diagnostics removed and a reference code in their place.
    if (!import.meta.env.DEV) {
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: SP.xl, backgroundColor: C.bgPage, fontFamily: FONT.body,
        }}>
          <style>{KEYFRAMES}{EXTRA_KEYFRAMES}</style>
          <div className='err-card' style={{
            width: '100%', maxWidth: 460, textAlign: 'center',
            backgroundColor: C.bgCard, borderRadius: RADIUS.lg,
            border: '1px solid ' + C.border, padding: SP.xl,
            boxShadow: '0 8px 32px rgba(24,28,50,0.08)',
          }}>
            <div style={{
              width: 44, height: 44, margin: '0 auto', borderRadius: RADIUS.md,
              background: 'linear-gradient(135deg, ' + SLATE.dark + ' 0%, ' + SLATE.mid + ' 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className='bi bi-exclamation-triangle' style={{ fontSize: 20, color: '#fff' }} />
            </div>
            <h3 style={{
              fontFamily: FONT.heading, fontWeight: 700, fontSize: 18,
              color: C.textPrimary, margin: SP.lg + ' 0 ' + SP.sm + ' 0',
            }}>
              This page could not be loaded
            </h3>
            <p style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>
              Something went wrong and the problem has been reported. The rest of the
              application is unaffected — reload to try again.
            </p>
            <div style={{
              margin: SP.lg + ' 0', padding: SP.sm + ' ' + SP.md,
              backgroundColor: C.bgSection, border: '1px solid ' + C.border,
              borderRadius: RADIUS.md, display: 'inline-block',
            }}>
              <span style={{ fontSize: 11, color: C.textMuted, letterSpacing: '0.6px' }}>REFERENCE</span>
              <div style={{
                fontFamily: "'Fira Code', 'Consolas', monospace",
                fontSize: 15, fontWeight: 700, color: C.textPrimary, letterSpacing: '1.5px',
              }}>
                {reference}
              </div>
            </div>
            <div style={{ display: 'flex', gap: SP.md, justifyContent: 'center' }}>
              <button type='button' onClick={() => window.history.back()} style={{ ...BTN.secondary, padding: '9px 20px' }}>
                <i className='bi bi-arrow-left' style={{ fontSize: 13 }} />
                Go back
              </button>
              <button type='button' onClick={() => window.location.reload()} style={{ ...BTN.primary, padding: '9px 20px' }}>
                <i className='bi bi-arrow-clockwise' style={{ fontSize: 13 }} />
                Reload page
              </button>
            </div>
          </div>
          <p style={{ marginTop: SP.lg, fontSize: 12, color: C.textMuted, textAlign: 'center' }}>
            If this keeps happening, quote reference <b>{reference}</b> to your administrator.
          </p>
        </div>
      );
    }

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
              <AppIcon name="bi-exclamation-triangle" className="fs-2" color="#fff" />
            </div>
            <div>
              <h3 style={{
                fontFamily: FONT.heading,
                fontWeight: 700, fontSize: 19,
                color: C.textPrimary,
                letterSpacing: '-0.3px',
                margin: 0, lineHeight: 1.25,
              }}>
                Something Went Wrong on This Page
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
                <AppIcon name="bi-arrow-left" className="fs-7" />
                Go back
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ ...BTN.primary, padding: '9px 20px' }}
              >
                <AppIcon name="bi-arrow-clockwise" className="fs-7" />
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
