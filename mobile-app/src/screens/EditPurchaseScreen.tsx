import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { apiClient } from '../services/apiClient';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { Picker } from '@react-native-picker/picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function EditPurchaseScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params;
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppRes, prodRes, purRes] = await Promise.all([
          apiClient.get('/suppliers'),
          apiClient.get('/products'),
          apiClient.get(`/purchases/${id}`)
        ]);
        setSuppliers(suppRes.data || []);
        setProducts(prodRes.data.data || []);
        
        const pur = purRes.data.data || purRes.data;
        if (pur.supplierId) setSelectedSupplierId(pur.supplierId._id || pur.supplierId.id || pur.supplierId);
        if (pur.items) setCart(pur.items);
        if (pur.purchaseInvoiceNumber) setInvoiceNumber(pur.purchaseInvoiceNumber);

        if (prodRes.data.data?.length > 0) {
          const firstProd = prodRes.data.data[0];
          setSelectedProductId(firstProd._id || firstProd.id);
          setUnitPrice(firstProd.purchasePrice?.toString() || '0');
        }
      } catch (error) {
        console.error('Failed to fetch data for Edit Purchases:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setShowScanner(false);
    if (selectedSerials.includes(data)) {
      Alert.alert('Duplicate', 'This serial number is already added.');
      return;
    }
    setSelectedSerials([...selectedSerials, data]);
    setQuantity((prev) => (parseInt(prev) + 1).toString());
  };

  const removeSerial = (serial: string) => {
    setSelectedSerials(selectedSerials.filter(s => s !== serial));
    setQuantity((prev) => Math.max(0, parseInt(prev) - 1).toString());
  };

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
      serialNumbers: [...selectedSerials],
    };

    setCart([...cart, newItem]);
    setSelectedSerials([]);
    setQuantity('1');
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleUpdate = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before updating');
      return;
    }
    if (!selectedSupplierId) {
      Alert.alert('Missing Supplier', 'Please select a supplier');
      return;
    }
    if (!invoiceNumber.trim()) {
      Alert.alert('Missing Invoice', 'Please enter a purchase invoice number');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        purchaseInvoiceNumber: invoiceNumber,
        supplierId: selectedSupplierId,
        items: cart,
        subtotal: subtotal,
        discount: 0,
        taxableAmount: subtotal,
        taxRate: 0,
        taxAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        grandTotal: subtotal,
        amountPaid: subtotal,
        paymentMode: 'CASH',
      };

      await apiClient.put(`/purchases/${id}`, payload);
      Alert.alert('Success', 'Purchase updated successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Update Failed', error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingOverlay visible={true} message="Loading Purchases..." />;

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1, padding: designTokens.spacing.marginMobile }}>
        <Text style={styles.header}>Edit Purchase</Text>

        <Text style={styles.label}>Invoice Number</Text>
        <TextInput
          style={[styles.input, { marginBottom: designTokens.spacing.stackMd }]}
          placeholder="Enter invoice #"
          value={invoiceNumber}
          onChangeText={setInvoiceNumber}
        />

        <Text style={styles.label}>Select Supplier</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedSupplierId}
            onValueChange={(val) => setSelectedSupplierId(val)}
          >
            {suppliers.map(s => (
              <Picker.Item key={s._id || s.id} label={s.name} value={s._id || s.id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Add Product to Cart</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedProductId}
            onValueChange={(val) => {
              setSelectedProductId(val);
              const p = products.find(prod => (prod._id || prod.id) === val);
              if (p) setUnitPrice(p.purchasePrice?.toString() || '0');
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

        <View style={styles.serialContainer}>
          <Text style={styles.label}>Serial Numbers</Text>
          {selectedSerials.map(s => (
            <View key={s} style={styles.serialRow}>
              <Text style={styles.serialText}>{s}</Text>
              <TouchableOpacity onPress={() => removeSerial(s)}>
                <Text style={styles.removeText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity 
            style={styles.scanButton} 
            onPress={async () => {
              if (!permission?.granted) {
                const req = await requestPermission();
                if (!req.granted) {
                  Alert.alert('Permission Denied', 'Camera permission is required to scan serial numbers.');
                  return;
                }
              }
              setShowScanner(true);
            }}
          >
            <Text style={styles.scanButtonText}>Scan Barcode/QR</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addToCart}>
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>

        <Text style={[styles.header, { marginTop: 20 }]}>Cart Items</Text>
        {cart.length === 0 ? (
          <Text style={styles.emptyCartText}>Cart is empty</Text>
        ) : (
          cart.map((item, index) => (
            <View key={index} style={styles.cartItem}>
              <View>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemDetails}>
                  {item.quantity} x ₹{item.unitPrice.toFixed(2)}
                </Text>
                {item.serialNumbers.length > 0 && (
                  <Text style={styles.serialTextSmall}>SN: {item.serialNumbers.join(', ')}</Text>
                )}
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
          <Text style={styles.checkoutButtonText}>Update Purchase</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showScanner} animationType="slide" transparent={false}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39"],
            }}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerText}>Point at a barcode or QR code</Text>
            <TouchableOpacity style={styles.scanCancelButton} onPress={() => setShowScanner(false)}>
              <Text style={styles.scanCancelText}>Cancel</Text>
            </TouchableOpacity>
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
  },
  serialContainer: {
    backgroundColor: designTokens.colors.surface,
    padding: designTokens.spacing.stackMd,
    borderRadius: designTokens.rounded.md,
    borderWidth: 1,
    borderColor: designTokens.colors.outlineVariant,
    marginBottom: designTokens.spacing.stackMd,
  },
  serialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.outlineVariant,
  },
  serialText: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurface,
  },
  serialTextSmall: {
    ...designTokens.typography.labelSm,
    color: designTokens.colors.onSurfaceVariant,
    marginTop: 2,
  },
  scanButton: {
    backgroundColor: designTokens.colors.primary,
    padding: designTokens.spacing.stackSm,
    borderRadius: designTokens.rounded.sm,
    alignItems: 'center',
    marginTop: designTokens.spacing.stackSm,
  },
  scanButtonText: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.onPrimary,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
  },
  scannerText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8,
  },
  scanCancelButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
  },
  scanCancelText: {
    color: 'black',
    fontWeight: 'bold',
  }
});
