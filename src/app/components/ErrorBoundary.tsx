import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
}

/**
 * Catches render-time exceptions in the page area so a single crashing screen shows a
 * friendly message instead of blanking the whole app (white screen). The surrounding
 * layout (sidebar/header) stays usable. Reset it by changing its `key` on navigation.
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: '' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface the real cause in the console for diagnosis.
    console.error('Page crashed (caught by ErrorBoundary):', error, info?.componentStack);
    this.setState({ componentStack: info?.componentStack || '' });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center" style={{ minHeight: '60vh', padding: '24px' }}>
        <div className="card shadow-sm" style={{ maxWidth: 520, width: '100%' }}>
          <div className="card-body p-8">
            <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 12 }}>⚠️</div>
            <h3 className="mb-2" style={{ fontWeight: 700, color: '#1f2430' }}>Something went wrong on this page</h3>
            <p className="text-muted mb-5" style={{ fontSize: 14 }}>
              An unexpected error stopped this page from loading. The rest of the app is still working —
              you can go back or reload.
            </p>

            {this.state.error && (
              <pre style={{ textAlign: 'left', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8, padding: 12, fontSize: 12, color: '#b43f45', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 260, overflow: 'auto' }}>
                {this.state.error.message}
                {this.state.componentStack ? `\n${this.state.componentStack.split('\n').slice(0, 6).join('\n')}` : ''}
              </pre>
            )}

            <div className="d-flex gap-3 justify-content-center mt-4">
              <button type="button" className="btn btn-light" onClick={() => window.history.back()}>
                Go back
              </button>
              <button type="button" className="btn btn-primary" style={{ backgroundColor: '#b43f45', borderColor: '#b43f45' }} onClick={() => window.location.reload()}>
                Reload page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
