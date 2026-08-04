import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

export default function MenuScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
          await logout();
      }}
    ]);
  };

  const menuItems = [
    { title: 'New Quotation', icon: 'file-text', route: 'Quotations' },
    { title: 'Sales History', icon: 'shopping-cart', route: 'SalesHistory' },
    { title: 'Purchases History', icon: 'truck', route: 'PurchasesHistory' },
    { title: 'Quotations History', icon: 'file', route: 'QuotationsHistory' },
    { title: 'Customers', icon: 'users', route: 'Customers' },
    { title: 'Suppliers', icon: 'truck', route: 'Suppliers' },
    { title: 'Categories', icon: 'list', route: 'Categories' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>More Options</Text>
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.menuItem}
          onPress={() => navigation.navigate(item.route)}
        >
          <View style={styles.iconContainer}>
            <Feather name={item.icon as any} size={24} color={designTokens.colors.primary} />
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Feather name="chevron-right" size={24} color={designTokens.colors.outlineVariant} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.menuItem, { marginTop: designTokens.spacing.stackLg }]}
        onPress={handleLogout}
      >
        <View style={styles.iconContainer}>
          <Feather name="log-out" size={24} color={designTokens.colors.error} />
        </View>
        <Text style={[styles.title, { color: designTokens.colors.error }]}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
    padding: designTokens.spacing.marginMobile,
  },
  header: {
    ...designTokens.typography.headlineSm,
    color: designTokens.colors.primary,
    marginBottom: designTokens.spacing.stackLg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  iconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: designTokens.spacing.stackMd,
  },
  title: {
    flex: 1,
    ...designTokens.typography.titleLg,
    color: designTokens.colors.onSurface,
  }
});
