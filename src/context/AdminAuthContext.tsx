import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminSession } from '../types';
import { authService } from '../services/authService';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  adminUser: AdminSession | null;
  login: (emailOrPassword: string, password?: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  failedAttempts: number;
  isLocked: boolean;
  lockTimeRemaining: number;
  rememberedEmail: string;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminSession | null>(() => authService.getSession());
  const [lockout, setLockout] = useState(() => authService.getLockoutState());
  const [rememberedEmail, setRememberedEmail] = useState<string>(() => authService.getRememberedEmail());

  useEffect(() => {
    const handleAuthChange = () => {
      setAdminUser(authService.getSession());
      setLockout(authService.getLockoutState());
      setRememberedEmail(authService.getRememberedEmail());
    };
    window.addEventListener('quantum_auth_updated', handleAuthChange);
    return () => window.removeEventListener('quantum_auth_updated', handleAuthChange);
  }, []);

  const login = async (
    emailOrPassword: string,
    passwordArg?: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await authService.login(emailOrPassword, passwordArg, rememberMe);
    setAdminUser(authService.getSession());
    setLockout(authService.getLockoutState());
    setRememberedEmail(authService.getRememberedEmail());

    return {
      success: result.success,
      error: result.error,
    };
  };

  const logout = () => {
    authService.logout();
    setAdminUser(null);
    setLockout(authService.getLockoutState());
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated: !!adminUser,
        adminUser,
        login,
        logout,
        failedAttempts: lockout.failedAttempts,
        isLocked: lockout.isLocked,
        lockTimeRemaining: lockout.lockTimeRemaining,
        rememberedEmail,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
