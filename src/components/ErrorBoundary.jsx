import { Component } from 'react';

/**
 * Minimal error boundary so a single component fault never blanks the whole
 * demo. Brutalist fallback card with a reload action.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--color-bg-dark)',
            zIndex: 9999,
            padding: '1.5rem',
          }}
        >
          <div className="brutal-card" style={{ maxWidth: 440, padding: '1.5rem', background: 'var(--color-bg)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>SOMETHING BROKE</h2>
            <p className="mono" style={{ fontSize: '0.85rem', color: 'var(--color-danger)', marginBottom: '1.25rem', wordBreak: 'break-word' }}>
              {this.state.message}
            </p>
            <button className="btn-brutal" onClick={() => window.location.reload()}>
              RELOAD
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
