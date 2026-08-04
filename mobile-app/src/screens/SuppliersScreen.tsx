import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { designTokens } from '../theme/designTokens';
import { apiClient } from '../services/apiClient';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.get('/suppliers');
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers', error);
    } finally {
      setLoading(false);
    }
  };

  const navigation = useNavigation<any>();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Ledger', { entityId: item._id || item.id, entityType: 'SUPPLIER' })}>
      <Text style={styles.name}>{item.name}</Text>
      {item.phone && <Text style={styles.detail}>Phone: {item.phone}</Text>}
      {item.gstNumber && <Text style={styles.detail}>GST: {item.gstNumber}</Text>}
      <Text style={styles.balance}>
        Balance: ₹{(item.outstandingBalance || 0).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  if (loading) return <LoadingOverlay visible={true} message="Loading Suppliers..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={suppliers}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No suppliers found.</Text>}
      />
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
  name: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
    marginBottom: 4,
  },
  detail: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
  },
  balance: {
    ...designTokens.typography.bodyLg,
    color: designTokens.colors.error,
    marginTop: 8,
    fontWeight: '600',
  },
  emptyText: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 20,
  }
});
