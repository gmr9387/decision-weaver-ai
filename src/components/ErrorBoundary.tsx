import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => window.location.reload();

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-display-sm text-foreground">Something went wrong</h1>
            <p className="text-body-sm text-muted-foreground">
              An unexpected error occurred. You can try reloading the page or going back.
            </p>
          </div>
          {this.state.error && (
            <div className="rounded-lg bg-surface-2 border border-border p-4 text-left">
              <p className="text-caption font-mono text-destructive break-all">
                {this.state.error.message}
              </p>
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={this.handleReset}>Try Again</Button>
            <Button variant="hero" className="gap-2" onClick={this.handleReload}>
              <RefreshCw className="w-4 h-4" /> Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
