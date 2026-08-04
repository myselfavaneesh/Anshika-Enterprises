import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { apiClient } from '../services/apiClient';
import { AuthContext } from '../context/AuthContext';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      
      if (response.data && response.data.token) {
        await login(response.data.token);
      } else {
        Alert.alert('Login Failed', 'Invalid response from server');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Login failed. Please check your credentials.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading} message="Signing in..." />
      
      <View style={styles.formContainer}>
        <Text style={styles.title}>Anshika Enterprises</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="admin@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
    justifyContent: 'center',
    padding: designTokens.spacing.marginMobile,
  },
  formContainer: {
    backgroundColor: designTokens.colors.surface,
    padding: designTokens.spacing.stackLg,
    borderRadius: designTokens.rounded.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    ...designTokens.typography.headlineMd,
    color: designTokens.colors.primary,
    textAlign: 'center',
    marginBottom: designTokens.spacing.stackSm,
  },
  subtitle: {
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: designTokens.spacing.stackLg,
  },
  inputGroup: {
    marginBottom: designTokens.spacing.stackMd,
  },
  label: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.primary,
    marginBottom: designTokens.spacing.base,
  },
  input: {
    backgroundColor: designTokens.colors.surface,
    borderWidth: 1,
    borderColor: designTokens.colors.outlineVariant,
    borderRadius: designTokens.rounded.DEFAULT,
    padding: designTokens.spacing.stackSm,
    ...designTokens.typography.bodyMd,
    color: designTokens.colors.onSurface,
  },
  button: {
    backgroundColor: designTokens.colors.secondary,
    padding: designTokens.spacing.stackMd,
    borderRadius: designTokens.rounded.DEFAULT,
    alignItems: 'center',
    marginTop: designTokens.spacing.stackSm,
  },
  buttonText: {
    ...designTokens.typography.labelMd,
    color: designTokens.colors.onSecondary,
    fontWeight: 'bold',
  },
});
