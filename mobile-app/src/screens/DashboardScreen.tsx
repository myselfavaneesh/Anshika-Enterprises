import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { designTokens } from '../theme/designTokens';

export default function DashboardScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Overview</Text>
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Sales</Text>
          <Text style={styles.kpiValue}>₹ 12,500</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Low Stock</Text>
          <Text style={[styles.kpiValue, { color: designTokens.colors.error }]}>8 Items</Text>
        </View>
      </View>
      
      <Text style={styles.header}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Sales')}>
          <Text style={styles.primaryButtonText}>New Sale</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Inventory')}>
          <Text style={styles.secondaryButtonText}>Check Stock</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
    padding: designTokens.spacing.marginMobile,
  },
  header: {
    ...designTokens.typography.headlineSm,
    color: designTokens.colors.primary,
    marginBottom: designTokens.spacing.stackMd,
    marginTop: designTokens.spacing.stackMd,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.stackLg,
  },
  kpiCard: {
    backgroundColor: designTokens.colors.surface,
    padding: designTokens.spacing.stackMd,
    borderRadius: designTokens.rounded.md,
    flex: 1,
    marginHorizontal: designTokens.spacing.base,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  kpiLabel: {
    ...designTokens.typography.labelSm,
    color: designTokens.colors.onSurfaceVariant,
    marginBottom: designTokens.spacing.stackSm,
  },
  kpiValue: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
  },
  actionsContainer: {
    gap: designTokens.spacing.stackMd,
  },
  primaryButton: {
    backgroundColor: designTokens.colors.secondary,
    padding: designTokens.spacing.stackMd,
    borderRadius: designTokens.rounded.DEFAULT,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.onSecondary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: designTokens.colors.secondary,
    padding: designTokens.spacing.stackMd,
    borderRadius: designTokens.rounded.DEFAULT,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.secondary,
  }
});
