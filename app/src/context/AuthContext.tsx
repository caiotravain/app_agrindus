import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const username = await SecureStore.getItemAsync('userName');
        const userType = await SecureStore.getItemAsync('userType') as 'management' | 'factory' | null;
        if (token && username && userType) {
          setUser({ username, token, user_type: userType });
        }
      } catch (e) {
        console.error('Falha ao carregar o token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiClient.post('/api/login/', { username, password });
      const { token, user_type } = response.data;
      await SecureStore.setItemAsync('userToken', token);
      await SecureStore.setItemAsync('userName', username);
      await SecureStore.setItemAsync('userType', user_type);
      setUser({ username, token, user_type });
    } catch (e) {
      console.error('Falha no login', e);
      throw e;
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userName');
    await SecureStore.deleteItemAsync('userType');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
