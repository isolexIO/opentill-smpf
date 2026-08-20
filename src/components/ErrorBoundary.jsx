import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * ErrorBoundary — catches render-time errors in the app tree so a single
 * page/component crash does not white-screen the entire app. Shows a visible
 * error message and a reload button instead of a blank screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-4">
              The page hit an unexpected error. Try reloading — your data is safe.
            </p>
            <pre className="text-left text-xs bg-gray-100 rounded p-3 mb-4 overflow-auto max-h-40 text-red-700">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <Button onClick={this.handleReload} className="w-full">
              Reload page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}