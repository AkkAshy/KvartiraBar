import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        const response = await authAPI.getProfile();
        setUser(response.data);
      }
    } catch (error) {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, password) => {
    const response = await authAPI.login(phone, password);
    await SecureStore.setItemAsync('accessToken', response.data.access);
    await SecureStore.setItemAsync('refreshToken', response.data.refresh);

    const profileResponse = await authAPI.getProfile();
    setUser(profileResponse.data);
    return response.data;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    await SecureStore.setItemAsync('accessToken', response.data.access);
    await SecureStore.setItemAsync('refreshToken', response.data.refresh);
    setUser(response.data.user);
    return response.data;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
