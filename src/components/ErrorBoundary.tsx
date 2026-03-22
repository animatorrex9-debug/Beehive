import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-primary flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-zinc-950 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-zinc-800 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-black tracking-tighter dark:text-white uppercase mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
              We encountered an unexpected error. Don't worry, your data is safe. 
              Try refreshing the page or going back to the home screen.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl text-left overflow-auto max-h-40 border border-red-100 dark:border-red-900/20">
                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 py-4 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 py-4 bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-2xl font-black uppercase tracking-widest transition-all border border-gray-200 dark:border-zinc-800"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
