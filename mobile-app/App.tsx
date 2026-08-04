import React, { useContext } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { LoadingOverlay } from './src/components/common/LoadingOverlay';

const MainComponent = () => {
  const { token, loading } = useContext(AuthContext);

  if (loading) {
    return <LoadingOverlay visible={true} message="Loading App..." />;
  }

  return token ? <AppNavigator /> : <LoginScreen />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <MainComponent />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
