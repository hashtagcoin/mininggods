import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[ErrorBoundary] Error caught:', error);
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Error details:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#0f0f23',
            color: '#ffffff',
            padding: 4
          }}
        >
          <Typography variant="h4" sx={{ mb: 2, color: '#ff6b35' }}>
            Something went wrong
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          {this.state.errorInfo && (
            <Box
              sx={{
                backgroundColor: '#1a1a2e',
                padding: 2,
                borderRadius: 1,
                maxWidth: '80%',
                maxHeight: '300px',
                overflow: 'auto',
                mb: 2
              }}
            >
              <Typography
                variant="body2"
                component="pre"
                sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              >
                {this.state.errorInfo.componentStack}
              </Typography>
            </Box>
          )}
          <Button
            variant="contained"
            onClick={this.handleReset}
            sx={{
              backgroundColor: '#ff6b35',
              '&:hover': {
                backgroundColor: '#ff8555'
              }
            }}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Canvas-specific error boundary for Three.js contexts
export const CanvasErrorBoundary: React.FC<Props> = ({ children }) => {
  return <ErrorBoundary>{children}</ErrorBoundary>;
};

export default ErrorBoundary;