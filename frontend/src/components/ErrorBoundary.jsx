import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--color-error)' }}>Something went wrong.</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            We're sorry for the inconvenience. Here is the exact error:
          </p>
          <pre style={{ background: 'var(--color-bg-surface-elevated)', padding: '1rem', borderRadius: '8px', textAlign: 'left', overflowX: 'auto', color: 'var(--color-error)' }}>
            {this.state.error && this.state.error.toString()}
            {'\n'}
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '1rem' }}
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
