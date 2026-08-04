import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { apiClient } from '../services/apiClient';

interface InventoryRecord {
  _id: string;
  productId: {
    _id: string;
    sku: string;
    name: string;
    lowStockThreshold: number;
  };
  quantity: number;
  updatedAt: string;
}

export default function InventoryScreen() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await apiClient.get('/inventory');
        setInventory(response.data.data || response.data);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  if (loading) return <LoadingOverlay visible={true} message="Loading inventory..." />;

  const renderItem = ({ item }: { item: InventoryRecord }) => {
    const isLowStock = item.quantity <= (item.productId?.lowStockThreshold || 0);

    return (
      <View style={styles.card}>
        <View>
          <Text style={styles.productName}>{item.productId?.name || 'Unknown'}</Text>
          <Text style={styles.productSku}>{item.productId?.sku || 'N/A'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.stockText}>Qty: {item.quantity || 0}</Text>
          {isLowStock && (
            <View style={styles.warningPill}>
              <Text style={styles.warningText}>Low Stock</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={inventory}
        keyExtractor={(item, index) => item?._id ? item._id.toString() : index.toString()}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  productName: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
  },
  productSku: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
  },
  stockText: {
    ...designTokens.typography.bodyMd,
    fontWeight: 'bold',
    color: designTokens.colors.primary,
  },
  warningPill: {
    backgroundColor: designTokens.colors.errorContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: designTokens.rounded.full,
    marginTop: 4,
  },
  warningText: {
    ...designTokens.typography.labelSm,
    color: designTokens.colors.onErrorContainer,
  }
});
