import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { apiClient } from '../services/apiClient';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { generateAndSharePDF } from '../services/pdfService';
import { useNavigation } from '@react-navigation/native';

export default function SalesHistoryScreen() {
  const navigation = useNavigation<any>();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await apiClient.get('/sales');
      setSales(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch sales history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (sale: any) => {
    if (!sale.customerId?.email) {
      Alert.alert('Missing Email', 'No email address found for this customer. Please update customer details first.');
      return;
    }
    try {
      const saleId = sale._id || sale.id;
      await apiClient.post(`/sales/${saleId}/email`);
      Alert.alert('Email Sent', `Invoice emailed successfully to ${sale.customerId.email}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send invoice email.');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.invoice}>{item.invoiceNumber || 'No Invoice #'}</Text>
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.customerName}>{item.customerId?.name || 'Unknown Customer'}</Text>
        <Text style={styles.amount}>₹{(item.grandTotal || 0).toFixed(2)}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.printButton, { backgroundColor: designTokens.colors.secondary, marginRight: 6 }]} onPress={() => navigation.navigate('EditSale', { id: item._id || item.id })}>
          <Text style={styles.printButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.printButton, { backgroundColor: '#2563EB', marginRight: 6 }]} onPress={() => handleSendEmail(item)}>
          <Text style={styles.printButtonText}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.printButton} onPress={() => generateAndSharePDF(item, 'Tax Invoice').catch(() => Alert.alert('Error', 'Could not generate PDF'))}>
          <Text style={styles.printButtonText}>Print / Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <LoadingOverlay visible={true} message="Loading Sales..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={sales}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No sales history found.</Text>}
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
  customerName: {
    ...designTokens.typography.bodyLg,
    color: designTokens.colors.onSurfaceVariant,
  },
  amount: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.secondary,
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
