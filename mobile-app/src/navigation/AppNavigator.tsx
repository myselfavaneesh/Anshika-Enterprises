import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import InventoryScreen from '../screens/InventoryScreen';
import SalesScreen from '../screens/SalesScreen';
import PurchasesScreen from '../screens/PurchasesScreen';
import MenuScreen from '../screens/MenuScreen';
import CustomersScreen from '../screens/CustomersScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import QuotationsScreen from '../screens/QuotationsScreen';
import LedgerScreen from '../screens/LedgerScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import PurchasesHistoryScreen from '../screens/PurchasesHistoryScreen';
import QuotationsHistoryScreen from '../screens/QuotationsHistoryScreen';
import NewPaymentScreen from '../screens/NewPaymentScreen';
import EditSaleScreen from '../screens/EditSaleScreen';
import EditPurchaseScreen from '../screens/EditPurchaseScreen';
import EditQuotationScreen from '../screens/EditQuotationScreen';

import { designTokens } from '../theme/designTokens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MenuStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: designTokens.colors.primary },
        headerTintColor: designTokens.colors.onPrimary,
      }}
    >
      <Stack.Screen name="MenuRoot" component={MenuScreen} options={{ title: 'Menu' }} />
      <Stack.Screen name="Customers" component={CustomersScreen} />
      <Stack.Screen name="Suppliers" component={SuppliersScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="Quotations" component={QuotationsScreen} />
      <Stack.Screen name="Ledger" component={LedgerScreen} />
      <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} options={{ title: 'Sales History' }} />
      <Stack.Screen name="PurchasesHistory" component={PurchasesHistoryScreen} options={{ title: 'Purchases History' }} />
      <Stack.Screen name="QuotationsHistory" component={QuotationsHistoryScreen} options={{ title: 'Quotations History' }} />
      <Stack.Screen name="NewPayment" component={NewPaymentScreen} options={{ title: 'Add Payment' }} />
      <Stack.Screen name="EditSale" component={EditSaleScreen} options={{ title: 'Edit Sale' }} />
      <Stack.Screen name="EditPurchase" component={EditPurchaseScreen} options={{ title: 'Edit Purchase' }} />
      <Stack.Screen name="EditQuotation" component={EditQuotationScreen} options={{ title: 'Edit Quotation' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: designTokens.colors.primary },
          headerTintColor: designTokens.colors.onPrimary,
          tabBarActiveTintColor: designTokens.colors.secondary,
          tabBarInactiveTintColor: designTokens.colors.outline,
          tabBarStyle: { backgroundColor: designTokens.colors.surface },
          headerShown: route.name !== 'Menu', // Hide header for Menu tab since the stack provides it
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Feather.glyphMap;

            if (route.name === 'Dashboard') {
              iconName = 'home';
            } else if (route.name === 'Inventory') {
              iconName = 'box';
            } else if (route.name === 'Sales') {
              iconName = 'shopping-cart';
            } else if (route.name === 'Purchases') {
              iconName = 'truck';
            } else if (route.name === 'Menu') {
              iconName = 'menu';
            } else {
              iconName = 'circle';
            }

            return <Feather name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Inventory" component={InventoryScreen} />
        <Tab.Screen name="Sales" component={SalesScreen} />
        <Tab.Screen name="Purchases" component={PurchasesScreen} />
        <Tab.Screen name="Menu" component={MenuStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
