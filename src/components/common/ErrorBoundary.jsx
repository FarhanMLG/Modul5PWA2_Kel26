import React from 'react'
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#0a0d11',
            color: '#f0f3f6',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={32} color="#ef4444" />
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' }}>
            System Malfunction
          </h1>
          <p
            style={{
              color: '#8b949e',
              maxWidth: '460px',
              fontSize: '14px',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}
          >
            An unexpected error interrupted the Bore &amp; Barrel armory system.
            You can refresh or reset cache to restore operational readiness.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '6px',
                backgroundColor: '#d97706',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} /> Reload Page
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: '#cbd5e1',
                border: '1px solid #334155',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={16} /> Reset Storage &amp; Return
            </button>
          </div>

          {this.state.error && (
            <details
              style={{
                marginTop: '32px',
                textAlign: 'left',
                maxWidth: '600px',
                width: '100%',
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '12px',
                color: '#f87171',
              }}
            >
              <summary style={{ cursor: 'pointer', color: '#8b949e' }}>Error diagnostic info</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
