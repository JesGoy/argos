'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Browser-side; sends to console for now. Replace with Sentry/PostHog later.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900">Algo salió mal</h2>
          <p className="mt-2 text-sm text-red-800">
            Ocurrió un error inesperado en la página. Intenta recargar o vuelve al panel principal.
          </p>
          {this.state.error && (
            <pre className="mt-3 max-h-32 overflow-auto rounded bg-white p-2 text-left text-xs text-red-700">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Reintentar
            </button>
            <a
              href="/dashboard"
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Ir al panel
            </a>
          </div>
        </div>
      </div>
    );
  }
}
