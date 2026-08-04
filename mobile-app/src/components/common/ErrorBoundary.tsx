import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { designTokens } from '../../theme/designTokens';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops, something went wrong!</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.stackLg,
    backgroundColor: designTokens.colors.background,
  },
  title: {
    ...designTokens.typography.headlineMd,
    color: designTokens.colors.error,
    marginBottom: designTokens.spacing.stackMd,
  },
  message: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: designTokens.spacing.stackLg,
  },
  button: {
    backgroundColor: designTokens.colors.primary,
    paddingVertical: designTokens.spacing.stackMd,
    paddingHorizontal: designTokens.spacing.stackLg,
    borderRadius: designTokens.rounded.md,
  },
  buttonText: {
    ...designTokens.typography.bodyLg,
    color: designTokens.colors.onPrimary,
    fontWeight: 'bold',
  },
});
