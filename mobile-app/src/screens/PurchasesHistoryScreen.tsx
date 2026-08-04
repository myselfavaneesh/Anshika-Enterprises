import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { apiClient } from '../services/apiClient';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { generateAndSharePDF } from '../services/pdfService';
import { useNavigation } from '@react-navigation/native';

export default function PurchasesHistoryScreen() {
  const navigation = useNavigation<any>();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const response = await apiClient.get('/purchases');
      setPurchases(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch purchases history:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.invoice}>{item.purchaseInvoiceNumber || item.invoiceNumber || 'No Invoice #'}</Text>
        <Text style={styles.date}>{new Date(item.createdAt || item.purchaseDate).toLocaleDateString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.supplierName}>{item.supplierId?.name || 'Unknown Supplier'}</Text>
        <Text style={styles.amount}>₹{(item.grandTotal || 0).toFixed(2)}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.printButton, { backgroundColor: designTokens.colors.secondary, marginRight: 8 }]} onPress={() => navigation.navigate('EditPurchase', { id: item._id || item.id })}>
          <Text style={styles.printButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.printButton} onPress={() => generateAndSharePDF(item, 'Purchase Invoice').catch(() => Alert.alert('Error', 'Could not generate PDF'))}>
          <Text style={styles.printButtonText}>Print / Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <LoadingOverlay visible={true} message="Loading Purchases..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={purchases}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No purchases history found.</Text>}
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  invoice: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
  },
  date: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.outline,
  },
  supplierName: {
    ...designTokens.typography.bodyLg,
    color: designTokens.colors.onSurfaceVariant,
  },
  amount: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.error, // Red for money going out
  },
  emptyText: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: designTokens.spacing.stackSm,
    paddingTop: designTokens.spacing.stackSm,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.outlineVariant,
  },
  printButton: {
    backgroundColor: designTokens.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: designTokens.rounded.sm,
  },
  printButtonText: {
    ...designTokens.typography.labelSm,
    color: designTokens.colors.onPrimary,
  }
});
