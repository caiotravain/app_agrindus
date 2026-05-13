import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Image, SafeAreaView, useWindowDimensions } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const LoginScreen = () => {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor, insira usuário e senha');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
    } catch (error) {
      Alert.alert('Falha no Login', 'Credenciais inválidas ou erro no servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { alignSelf: 'center', width: '100%', maxWidth: 500 }]}>
        <View style={styles.logoContainer}>
          <Text style={[styles.logoText, isTablet && { fontSize: 60 }]}>AURICA</Text>
        </View>

        <Text style={[styles.welcomeText, isTablet && { fontSize: 30 }]}>BEM-VINDO!</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isTablet && { fontSize: 18 }]}>Usuário:</Text>
          <TextInput
            style={[styles.input, isTablet && { height: 60, fontSize: 22 }]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isTablet && { fontSize: 18 }]}>Senha:</Text>
          <TextInput
            style={[styles.input, isTablet && { height: 60, fontSize: 22 }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, isTablet && { height: 70, borderRadius: 35 }]} 
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={[styles.loginButtonText, isTablet && { fontSize: 20 }]}>
            {loading ? 'CARREGANDO...' : 'ACESSAR'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E9',
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#3C2F2F',
    letterSpacing: 2,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 40,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#3C2F2F',
    fontSize: 16,
    color: '#3C2F2F',
    paddingVertical: 5,
  },
  loginButton: {
    backgroundColor: '#3C2F2F',
    width: '100%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default LoginScreen;