// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { setOnUnauthorizedCallback } from '../services/api';

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  PATIENT: 'patient'
};

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

  // Função de login
  const login = useCallback((token, role, id) => {
    const roleLower = role ? role.toLowerCase() : '';
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', roleLower);
    localStorage.setItem('userId', id);
    setIsAuthenticated(true);
    setUserRole(roleLower);
    setUserId(id);
    console.log("[AuthContext login] Usuário logado. Role:", roleLower);
  }, []);

  // Função de logout
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    console.log("[AuthContext logout] Usuário deslogado.");
    navigate('/login');
  }, [navigate]);

  // Verifica status de autenticação
  const checkAuthStatus = useCallback(() => {
    setLoading(true);
    try {
      const storedToken = localStorage.getItem('token');
      const storedUserRole = localStorage.getItem('userRole');
      const storedUserId = localStorage.getItem('userId');

      if (storedToken && storedUserRole && storedUserId) {
        const decoded = jwtDecode(storedToken);
        const isTokenValid = decoded.exp * 1000 > Date.now();

        if (isTokenValid) {
          setIsAuthenticated(true);
          setUserRole(storedUserRole.toLowerCase());
          setUserId(storedUserId);
          console.log("[AuthContext checkAuthStatus] Usuário autenticado via localStorage. Role:", storedUserRole);
        } else {
          console.log("[AuthContext checkAuthStatus] Token expirado. Limpando localStorage.");
          logout();
        }
      } else {
        console.log("[AuthContext checkAuthStatus] Nenhum token encontrado ou dados incompletos. Não autenticado.");
        logout();
      }
    } catch (error) {
      console.error("[AuthContext checkAuthStatus] Falha ao processar token. Limpando...", error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    console.log("[AuthContext useEffect] Verificação inicial de autenticação.");
    checkAuthStatus();
    setOnUnauthorizedCallback(logout);
    return () => setOnUnauthorizedCallback(null);
  }, [checkAuthStatus, logout]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'token' || event.key === 'userRole' || event.key === 'userId') {
        console.log(`[AuthContext handleStorageChange] Mudança no localStorage detectada para a chave: ${event.key}. Re-verificando...`);
        checkAuthStatus();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuthStatus]);

  // Função para checar role
  const hasRole = useCallback((rolesToCheck = []) => {
    if (!userRole) return false;
    if (!rolesToCheck || rolesToCheck.length === 0) return true;
    return rolesToCheck.map(r => r.toLowerCase()).includes(userRole);
  }, [userRole]);

  const value = {
    isAuthenticated,
    userRole,
    userId,
    loading,
    login,
    logout,
    hasRole,
    USER_ROLES,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
