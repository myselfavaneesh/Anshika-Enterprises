import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { apiClient } from '../services/apiClient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

export default function NewPaymentScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { entityId, entityType } = route.params;

  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState(entityType === 'CUSTOMER' ? 'MONEY_IN' : 'MONEY_OUT');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/payments', {
        entityId,
        entityType,
        type,
        amount: Number(amount),
        paymentMode,
        referenceId,
        notes
      });
      Alert.alert('Success', 'Payment recorded successfully!');
      navigation.goBack(); // Go back to Ledger
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: designTokens.spacing.marginMobile }}>
      <Text style={styles.header}>Record Payment</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Transaction Type</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={type} onValueChange={setType}>
            <Picker.Item label="Money In (Received)" value="MONEY_IN" />
            <Picker.Item label="Money Out (Paid)" value="MONEY_OUT" />
          </Picker>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Payment Mode</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={paymentMode} onValueChange={setPaymentMode}>
            <Picker.Item label="Cash" value="CASH" />
            <Picker.Item label="Bank Transfer" value="BANK_TRANSFER" />
            <Picker.Item label="UPI" value="UPI" />
            <Picker.Item label="Cheque" value="CHEQUE" />
            <Picker.Item label="Card" value="CARD" />
            <Picker.Item label="Other" value="OTHER" />
          </Picker>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Reference Number (Optional)</Text>
        <TextInput
          style={styles.input}
          value={referenceId}
          onChangeText={setReferenceId}
          placeholder="UPI ref, Cheque No, etc."
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Any additional notes..."
        />
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, loading && { opacity: 0.7 }]} 
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Payment'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  header: {
    ...designTokens.typography.headlineSm,
    color: designTokens.colors.primary,
    marginBottom: designTokens.spacing.stackLg,
  },
  inputContainer: {
    marginBottom: designTokens.spacing.stackMd,
  },
  label: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  input: {
    backgroundColor: designTokens.colors.surface,
    borderWidth: 1,
    borderColor: designTokens.colors.outlineVariant,
    borderRadius: designTokens.rounded.md,
    padding: designTokens.spacing.stackMd,
    ...designTokens.typography.bodyMd,
  },
  pickerContainer: {
    backgroundColor: designTokens.colors.surface,
    borderWidth: 1,
    borderColor: designTokens.colors.outlineVariant,
    borderRadius: designTokens.rounded.md,
  },
  saveButton: {
    backgroundColor: designTokens.colors.secondary,
    padding: designTokens.spacing.stackLg,
    borderRadius: designTokens.rounded.DEFAULT,
    alignItems: 'center',
    marginTop: designTokens.spacing.stackMd,
    marginBottom: 40,
  },
  saveButtonText: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.onSecondary,
  }
});
