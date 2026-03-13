"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the entire app
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
          <Card className="w-full max-w-lg border-red-500/20 bg-neutral-900">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-xl text-white">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-neutral-400">
                We&apos;ve encountered an unexpected error. Please try refreshing the page or return home.
              </p>
              
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="rounded-lg bg-neutral-950 p-3">
                  <p className="mb-2 text-xs font-semibold text-red-400">Error Details (dev only):</p>
                  <pre className="max-h-32 overflow-auto text-xs text-neutral-500">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}
              
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  onClick={this.handleReload}
                  className="gap-2 bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
                <Link href="/">
                  <Button variant="outline" className="gap-2 border-neutral-700">
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                </Link>
              </div>
              
              {this.props.fallback && (
                <div className="pt-4 border-t border-neutral-800">
                  <Button
                    variant="ghost"
                    onClick={this.handleReset}
                    className="w-full text-neutral-500 hover:text-white"
                  >
                    Try to recover
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Smaller error boundary for dashboard sections
 */
export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SectionErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="flex flex-col items-center py-6 text-center">
            <AlertTriangle className="mb-2 h-6 w-6 text-red-500" />
            <p className="text-sm text-red-400">Failed to load section</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={this.handleReset}
              className="mt-2 text-xs text-neutral-500"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
