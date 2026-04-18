import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './global.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 48,
            color: 'var(--color-rust)',
            fontSize: 14,
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            height: '100vh',
            overflow: 'auto',
            background: 'var(--color-asphalt)',
          }}
        >
          <div style={{ color: 'var(--color-bone-white)', fontSize: 18, marginBottom: 16, fontFamily: 'var(--font-ui)' }}>
            Something broke.
          </div>
          {this.state.error.message}
          {'\n\n'}
          {this.state.error.stack}
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
