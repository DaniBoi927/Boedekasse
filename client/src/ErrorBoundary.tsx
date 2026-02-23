import React from 'react'

type Props = { children: React.ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('Unhandled error in React tree:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'Inter, Arial', color: '#111827' }}>
          <h2 style={{ color: '#b91c1c' }}>Something went wrong</h2>
          <div style={{ marginTop: 12 }}>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error && this.state.error.stack)}</pre>
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      )
    }

    return this.props.children as React.ReactElement
  }
}
