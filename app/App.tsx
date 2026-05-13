import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AuthProvider, AuthContext } from './src/context/AuthContext';

import LoginScreen from './src/screens/LoginScreen';
import ProceduresListScreen from './src/screens/ProceduresListScreen';
import ExecutionScreen from './src/screens/ExecutionScreen';
import PreDefinitionWizardScreen from './src/screens/PreDefinitionWizardScreen';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3C2F2F" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user == null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen 
              name="ProceduresList" 
              component={ProceduresListScreen} 
            />
            <Stack.Screen 
              name="Execution" 
              component={ExecutionScreen} 
            />
            <Stack.Screen 
              name="PreDefinitionWizard" 
              component={PreDefinitionWizardScreen} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5E9',
  },
});
