import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Last-resort UI guard — never show a blank white screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("App error boundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-5 bg-background text-center">
          <div className="w-16 h-16 rounded-full bg-error-container/40 flex items-center justify-center text-error">
            <span aria-hidden className="material-symbols-outlined text-[32px]">
              error
            </span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-background">Something went wrong</h1>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-sm">
            An unexpected error occurred. Reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
          >
            <span aria-hidden className="material-symbols-outlined text-[18px]">
              refresh
            </span>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
