'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AppErrorState } from '@/components/errors/app-error-state';
import { errorUiCopy } from '@/locales/vi/system-ui';
import { getErrorObservabilityContext } from '@/lib/error-taxonomy';

interface Props {
  children: ReactNode;
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
  feature?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const observabilityContext = getErrorObservabilityContext(error);

    // Remote observability (no-op if Sentry not configured)
    Sentry.captureException(error, {
      tags: {
        error_domain: observabilityContext.errorDomain,
        error_kind: observabilityContext.errorKind,
        error_api_code: observabilityContext.errorApiCode,
        error_source: observabilityContext.errorSource,
      },
      extra: {
        feature: this.props.feature,
        componentStack: info.componentStack,
        ...observabilityContext,
      },
    });

    // Local console fallback — always logs with full context
    console.error(
      `[ErrorBoundary] ${observabilityContext.errorDomain}:${observabilityContext.errorKind}`,
      {
        message: error.message,
        name: error.name,
        feature: this.props.feature,
        errorApiCode: observabilityContext.errorApiCode,
        errorSource: observabilityContext.errorSource,
        componentStack: info.componentStack?.split('\n').slice(0, 4).join(' | '),
      },
    );
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }

      return (
        <AppErrorState
          error={this.state.error}
          reset={this.reset}
          subject={errorUiCopy.subjects.systemData}
        />
      );
    }

    return this.props.children;
  }
}
