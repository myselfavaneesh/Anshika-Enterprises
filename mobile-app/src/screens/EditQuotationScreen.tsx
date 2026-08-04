import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { apiClient } from '../services/apiClient';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { Picker } from '@react-native-picker/picker';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function EditQuotationScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params;
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes, quoteRes] = await Promise.all([
          apiClient.get('/customers'),
          apiClient.get('/products'),
          apiClient.get(`/quotations/${id}`)
        ]);
        setCustomers(custRes.data || custRes.data?.data || []);
        setProducts(prodRes.data?.data || []);
        
        const quote = quoteRes.data?.data || quoteRes.data;
        if (quote.customerId) setSelectedCustomerId(quote.customerId._id || quote.customerId.id || quote.customerId);
        if (quote.items) setCart(quote.items);

        if (prodRes.data?.data?.length > 0) {
          const firstProd = prodRes.data.data[0];
          setSelectedProductId(firstProd._id || firstProd.id);
          setUnitPrice(firstProd.sellingPrice?.toString() || '0');
        }
      } catch (error) {
        console.error('Failed to fetch data for Edit Quotation:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addToCart = () => {
    const product = products.find(p => (p._id || p.id) === selectedProductId);
    if (!product) return;

    const qty = parseInt(quantity, 10);
    const price = parseFloat(unitPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      Alert.alert('Invalid Input', 'Please enter valid quantity and price');
      return;
    }

    const newItem = {
      productId: product._id || product.id,
      name: product.name,
      quantity: qty,
      unitPrice: price,
      totalPrice: qty * price,
      taxableUnitPrice: price,
      taxableTotalPrice: qty * price,
      gstRate: product.gstRate || 0,
      cgstAmount: 0,
      sgstAmount: 0,
      wattage: product.wattage || 0,
    };

    setCart([...cart, newItem]);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleUpdate = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before updating quotation');
      return;
    }
    if (!selectedCustomerId) {
      Alert.alert('Missing Customer', 'Please select a customer');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        invoiceType: 'NON_GST',
        items: cart,
        services: [],
        subtotal: subtotal,
        discount: 0,
        taxableAmount: subtotal,
        taxRate: 0,
        taxAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        grandTotal: subtotal,
      };

      await apiClient.put(`/quotations/${id}`, payload);
      Alert.alert('Success', 'Quotation updated successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingOverlay visible={true} message="Loading Quotations..." />;

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1, padding: designTokens.spacing.marginMobile }}>
        <Text style={styles.header}>Edit Quotation</Text>

        <Text style={styles.label}>Select Customer</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCustomerId}
            onValueChange={(val) => setSelectedCustomerId(val)}
          >
            {(Array.isArray(customers) ? customers : []).map(c => (
              <Picker.Item key={c._id || c.id} label={c.name} value={c._id || c.id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Add Product to Quote</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedProductId}
            onValueChange={(val) => {
              setSelectedProductId(val);
              const p = products.find(prod => (prod._id || prod.id) === val);
              if (p) setUnitPrice(p.sellingPrice?.toString() || '0');
            }}
          >
            {products.map(p => (
              <Picker.Item key={p._id || p.id} label={p.name} value={p._id || p.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.row}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Unit Price (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={unitPrice}
              onChangeText={setUnitPrice}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addToCart}>
          <Text style={styles.addButtonText}>Add to Quote</Text>
        </TouchableOpacity>

        <Text style={[styles.header, { marginTop: 20 }]}>Quote Items</Text>
        {cart.length === 0 ? (
          <Text style={styles.emptyCartText}>No items added</Text>
        ) : (
          cart.map((item, index) => (
            <View key={index} style={styles.cartItem}>
              <View>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemDetails}>
                  {item.quantity} x ₹{item.unitPrice.toFixed(2)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cartItemTotal}>₹{item.totalPrice.toFixed(2)}</Text>
                <TouchableOpacity onPress={() => removeFromCart(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.checkoutSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Items:</Text>
          <Text style={styles.summaryValue}>{cart.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Grand Total:</Text>
          <Text style={styles.summaryValue}>₹ {subtotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutButton} onPress={handleUpdate}>
          <Text style={styles.checkoutButtonText}>Update Quotation</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    marginBottom: designTokens.spacing.stackMd,
  },
  label: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  pickerContainer: {
    backgroundColor: designTokens.colors.surface,
    borderWidth: 1,
    borderColor: designTokens.colors.outlineVariant,
    borderRadius: designTokens.rounded.md,
    marginBottom: designTokens.spacing.stackMd,
  },
  row: {
    flexDirection: 'row',
    gap: designTokens.spacing.stackMd,
    marginBottom: designTokens.spacing.stackMd,
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    backgroundColor: designTokens.colors.surface,
    borderWidth: 1,
    borderColor: designTokens.colors.outlineVariant,
    borderRadius: designTokens.rounded.md,
    padding: designTokens.spacing.stackSm,
    ...designTokens.typography.bodyMd,
  },
  addButton: {
    backgroundColor: designTokens.colors.surface,
    borderWidth: 1,
    borderColor: designTokens.colors.primary,
    padding: designTokens.spacing.stackMd,
    borderRadius: designTokens.rounded.md,
    alignItems: 'center',
  },
  addButtonText: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.primary,
  },
  emptyCartText: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
    textAlign: 'center',
    padding: 20,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  cartItemName: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
  },
  cartItemDetails: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
  },
  cartItemTotal: {
    ...designTokens.typography.bodyLg,
    color: designTokens.colors.primary,
  },
  removeText: {
    ...designTokens.typography.labelSm,
    color: designTokens.colors.error,
    marginTop: 4,
  },
  checkoutSummary: {
    backgroundColor: designTokens.colors.surface,
    padding: designTokens.spacing.stackLg,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.outlineVariant,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.stackSm,
  },
  summaryLabel: {
    ...designTokens.typography.bodyLg,
    color: designTokens.colors.onSurfaceVariant,
  },
  summaryValue: {
    ...designTokens.typography.titleLg,
    color: designTokens.colors.primary,
  },
  checkoutButton: {
    backgroundColor: designTokens.colors.secondary,
    padding: designTokens.spacing.stackMd,
    borderRadius: designTokens.rounded.DEFAULT,
    alignItems: 'center',
    marginTop: designTokens.spacing.stackMd,
  },
  checkoutButtonText: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.onSecondary,
  }
});
