import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { designTokens } from '../../theme/designTokens';

interface Props {
  visible?: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<Props> = ({ visible = true, message = 'Loading...' }) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={designTokens.colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.8)', // designTokens.colors.background with opacity
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: designTokens.colors.surface,
    padding: designTokens.spacing.stackLg,
    borderRadius: designTokens.rounded.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  message: {
    ...designTokens.typography.bodyLg,
    color: designTokens.colors.primary,
    marginTop: designTokens.spacing.stackMd,
  },
});
