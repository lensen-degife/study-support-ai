import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getCurrentUser,
  loginApi,
  registerApi,
  logoutApi,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Seamless session rehydration from HttpOnly cookie on application load
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getCurrentUser();
      if (res && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      // 401 or network error -> treat as unauthenticated
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async ({ email, password }) => {
    setAuthError(null);
    try {
      const res = await loginApi({ email, password });
      setUser(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
      throw err;
    }
  };

  const register = async ({ name, email, password, role = 'student' }) => {
    setAuthError(null);
    try {
      const res = await registerApi({ name, email, password, role });
      setUser(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.warn('Logout API error:', err.message);
    } finally {
      setUser(null);
      setAuthError(null);
    }
  };

  const clearError = () => setAuthError(null);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    authError,
    login,
    register,
    logout,
    checkAuth,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
