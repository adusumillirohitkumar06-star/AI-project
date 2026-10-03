"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthState, LoginRequest, RegisterRequest, User, UserRole } from '../types/auth';
import { authApi } from '../lib/api/auth';

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  canPerform: (action: string) => boolean; // Helper based on role
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/register'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check for saved token/user on mount
    const savedToken = localStorage.getItem('airport_auth_token');
    const savedUserStr = localStorage.getItem('airport_auth_user');
    
    if (savedToken && savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        setState({
          user: savedUser,
          token: savedToken,
          isAuthenticated: true,
          isLoading: false,
        });
        
        // Optionally fetch fresh user data here
        // authApi.getCurrentUser().then(user => {
        //   localStorage.setItem('airport_auth_user', JSON.stringify(user));
        //   setState(prev => ({ ...prev, user }));
        // }).catch(() => logout());
      } catch (e) {
        logout();
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (data: LoginRequest) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authApi.login(data);
      const { access_token, user } = response;
      
      localStorage.setItem('airport_auth_token', access_token);
      localStorage.setItem('airport_auth_user', JSON.stringify(user));
      
      setState({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      router.push('/dashboard');
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await authApi.register(data);
      // Auto-login after register
      await login({ email: data.email, password: data.password });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('airport_auth_token');
    localStorage.removeItem('airport_auth_user');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    router.push('/login');
  };

  const hasRole = (role: UserRole) => {
    if (!state.user) return false;
    
    // Role hierarchy logic
    if (role === UserRole.VIEWER) return true; // Everyone can view
    if (role === UserRole.OPERATOR) return state.user.role === UserRole.OPERATOR || state.user.role === UserRole.ADMIN;
    if (role === UserRole.ADMIN) return state.user.role === UserRole.ADMIN;
    
    return false;
  };

  const canPerform = (action: string) => {
    // simplified permission logic
    if (!state.user) return false;
    if (state.user.role === UserRole.ADMIN) return true;
    if (state.user.role === UserRole.OPERATOR && action !== 'manage_users') return true;
    return false; // VIEWER can't perform actions
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, hasRole, canPerform }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
