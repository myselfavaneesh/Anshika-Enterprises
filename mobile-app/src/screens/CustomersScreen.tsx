import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { designTokens } from '../theme/designTokens';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { apiClient } from '../services/apiClient';
import { Customer } from '../types/api';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<any>();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await apiClient.get('/customers');
        setCustomers(response.data.data);
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  if (loading) return <LoadingOverlay />;

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Ledger', { entityId: item._id || item.id, entityType: 'CUSTOMER' })}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.phone}>{item.phone || 'N/A'}</Text>
      <Text style={[styles.balance, item.outstandingBalance > 0 ? styles.balanceDanger : styles.balanceSuccess]}>
        ₹ {item.outstandingBalance.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        keyExtractor={(item: any, index) => (item?._id || item?.id) ? (item._id || item.id).toString() : index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: designTokens.spacing.marginMobile }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  card: {
    backgroundColor: designTokens.colors.surface,
    padding: designTokens.spacing.stackMd,
    borderRadius: designTokens.rounded.md,
    marginBottom: designTokens.spacing.stackSm,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  name: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
  },
  phone: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  balance: {
    ...designTokens.typography.labelMd,
  },
  balanceDanger: {
    color: designTokens.colors.error,
  },
  balanceSuccess: {
    color: '#10B981', // Success green
  }
});
