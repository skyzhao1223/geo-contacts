import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="page-stack" role="alert">
        <section className="panel" style={{ padding: 24 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>
            {this.props.fallbackTitle ?? '页面出错了'}
          </h2>
          <p style={{ margin: '0 0 16px', color: 'var(--text-muted)' }}>
            {error.message || '发生未知错误'}
          </p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => this.setState({ error: null })}
          >
            重试
          </button>
        </section>
      </div>
    )
  }
}
