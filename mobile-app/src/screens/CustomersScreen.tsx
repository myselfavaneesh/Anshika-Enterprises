import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { designTokens } from '../theme/designTokens';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { apiClient } from '../services/apiClient';
import { Customer } from '../types/api';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/customers');
      setCustomers(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Customer name is required');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/customers', {
        name,
        phone,
        email,
        address,
        gstNumber,
      });
      Alert.alert('Success', 'Customer added successfully!');
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setGstNumber('');
      fetchCustomers();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'Failed to add customer';
      Alert.alert('Duplicate / Validation Error', errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingOverlay visible={true} message="Loading Customers..." />;

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Ledger', { entityId: item._id || item.id, entityType: 'CUSTOMER' })}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.phone}>Phone: {item.phone || 'N/A'}</Text>
      {item.email ? <Text style={styles.email}>Email: {item.email}</Text> : null}
      {item.gstNumber ? <Text style={styles.gst}>GST: {item.gstNumber}</Text> : null}
      <Text style={[styles.balance, (item.outstandingBalance || 0) > 0 ? styles.balanceDanger : styles.balanceSuccess]}>
        Balance: ₹ {(item.outstandingBalance || 0).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Customers ({customers.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsModalOpen(true)}>
          <Text style={styles.addButtonText}>+ Add Customer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item: any, index) => (item?._id || item?.id) ? (item._id || item.id).toString() : index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: designTokens.spacing.marginMobile }}
        ListEmptyComponent={<Text style={styles.emptyText}>No customers found.</Text>}
      />

      <Modal visible={isModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Customer</Text>
            
            <TextInput style={styles.input} placeholder="Customer Name *" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="GST Number" value={gstNumber} onChangeText={setGstNumber} autoCapitalize="characters" />
            <TextInput style={[styles.input, { height: 60 }]} placeholder="Address" value={address} onChangeText={setAddress} multiline={true} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#6B7280' }]} onPress={() => setIsModalOpen(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: designTokens.colors.primary }]} onPress={handleAddCustomer} disabled={saving}>
                <Text style={styles.modalButtonText}>{saving ? 'Saving...' : 'Save Customer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.marginMobile,
    paddingTop: designTokens.spacing.marginMobile,
  },
  headerTitle: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
  },
  addButton: {
    backgroundColor: designTokens.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: designTokens.rounded.md,
  },
  addButtonText: {
    ...designTokens.typography.labelSm,
    color: designTokens.colors.onPrimary,
    fontWeight: 'bold',
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
    marginBottom: 2,
  },
  phone: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
  },
  email: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
  },
  gst: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
  },
  balance: {
    ...designTokens.typography.labelMd,
    marginTop: 6,
    fontWeight: 'bold',
  },
  balanceDanger: {
    color: designTokens.colors.error,
  },
  balanceSuccess: {
    color: '#10B981',
  },
  emptyText: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: designTokens.colors.surface,
    borderRadius: designTokens.rounded.lg,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: designTokens.colors.outlineVariant,
    borderRadius: designTokens.rounded.sm,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: designTokens.rounded.md,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});
