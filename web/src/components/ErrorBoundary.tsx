import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  fallback: (error: Error) => ReactNode
  children: ReactNode
}

interface State {
  error: Error | null
}

// If a page crashes while drawing, show a message instead of a blank screen.
// The header and footer stay, so the reader can still go elsewhere.
// (React only offers this as a class component.)
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children
  }
}
