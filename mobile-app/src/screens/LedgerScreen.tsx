import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { apiClient } from '../services/apiClient';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function LedgerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { entityId, entityType } = route.params; // entityType: 'CUSTOMER' | 'SUPPLIER'
  
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLedger();
  }, [entityId]);

  const fetchLedger = async () => {
    try {
      const endpoint = entityType === 'CUSTOMER' ? `/customers/${entityId}/ledger` : `/suppliers/${entityId}/ledger`;
      const response = await apiClient.get(endpoint);
      setLedger(response.data?.ledger || []);
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isPayment = item.type === 'PAYMENT';
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.type}>{item.type} {item.invoiceNumber ? `(#${item.invoiceNumber})` : ''}</Text>
          <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.detail}>
            {isPayment ? (item.paymentType === 'MONEY_IN' ? 'Received' : 'Paid') : 'Amount'}
          </Text>
          <Text style={styles.amount}>
            ₹{(item.grandTotal || item.amount || 0).toFixed(2)}
          </Text>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={styles.balanceLabel}>Running Balance:</Text>
          <Text style={[styles.balance, { color: item.runningBalance > 0 ? designTokens.colors.error : designTokens.colors.secondary }]}>
            ₹{(item.runningBalance || 0).toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingOverlay visible={true} message="Loading Ledger..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={ledger}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No ledger entries found.</Text>}
      />
      <TouchableOpacity 
        style={styles.paymentButton} 
        onPress={() => navigation.navigate('NewPayment', { entityId, entityType })}
      >
        <Text style={styles.paymentButtonText}>+ Add Payment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  listContent: {
    padding: designTokens.spacing.marginMobile,
  },
  card: {
    backgroundColor: designTokens.colors.surface,
    padding: designTokens.spacing.stackMd,
    borderRadius: designTokens.rounded.md,
    marginBottom: designTokens.spacing.stackSm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  type: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
  },
  date: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.outline,
  },
  detail: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
  },
  amount: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
  },
  balanceLabel: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.onSurfaceVariant,
  },
  balance: {
    ...designTokens.typography.titleLg,
    fontWeight: '700',
  },
  emptyText: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 20,
  },
  paymentButton: {
    backgroundColor: designTokens.colors.secondary,
    padding: designTokens.spacing.stackMd,
    borderRadius: designTokens.rounded.DEFAULT,
    alignItems: 'center',
    margin: designTokens.spacing.marginMobile,
  },
  paymentButtonText: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.onSecondary,
  }
});
