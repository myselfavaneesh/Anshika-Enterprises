import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { designTokens } from '../theme/designTokens';
import { apiClient } from '../services/apiClient';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.get('/suppliers');
      setSuppliers(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Supplier name is required');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/suppliers', {
        name,
        phone,
        email,
        address,
        gstNumber,
      });
      Alert.alert('Success', 'Supplier added successfully!');
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setGstNumber('');
      fetchSuppliers();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'Failed to add supplier';
      Alert.alert('Duplicate / Validation Error', errMsg);
    } finally {
      setSaving(false);
    }
  };

  const navigation = useNavigation<any>();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Ledger', { entityId: item._id || item.id, entityType: 'SUPPLIER' })}>
      <Text style={styles.name}>{item.name}</Text>
      {item.phone && <Text style={styles.detail}>Phone: {item.phone}</Text>}
      {item.email && <Text style={styles.detail}>Email: {item.email}</Text>}
      {item.gstNumber && <Text style={styles.detail}>GST: {item.gstNumber}</Text>}
      <Text style={styles.balance}>
        Balance: ₹{(item.outstandingBalance || 0).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  if (loading) return <LoadingOverlay visible={true} message="Loading Suppliers..." />;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Suppliers ({suppliers.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsModalOpen(true)}>
          <Text style={styles.addButtonText}>+ Add Supplier</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={suppliers}
        keyExtractor={(item) => (item._id || item.id || Math.random()).toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No suppliers found.</Text>}
      />

      <Modal visible={isModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Supplier</Text>
            
            <TextInput style={styles.input} placeholder="Supplier Name *" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="GST Number" value={gstNumber} onChangeText={setGstNumber} autoCapitalize="characters" />
            <TextInput style={[styles.input, { height: 60 }]} placeholder="Address" value={address} onChangeText={setAddress} multiline={true} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#6B7280' }]} onPress={() => setIsModalOpen(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: designTokens.colors.primary }]} onPress={handleAddSupplier} disabled={saving}>
                <Text style={styles.modalButtonText}>{saving ? 'Saving...' : 'Save Supplier'}</Text>
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
