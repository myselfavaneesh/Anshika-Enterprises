import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
  hasPermission: (...permissions: string[]) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Ensure backwards compatibility — old users without permissions get empty array
        if (!parsedUser.permissions) {
          parsedUser.permissions = [];
        }
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        // Corrupted storage — clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    // Ensure permissions is always an array
    const userWithPermissions = {
      ...newUser,
      permissions: newUser.permissions || [],
    };
    setToken(newToken);
    setUser(userWithPermissions);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userWithPermissions));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  /**
   * Check if current user has at least one of the specified permissions.
   * Admin role always returns true (bypasses all permission checks).
   */
  const hasPermission = useCallback((...permissions: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin bypasses all
    return permissions.some((p) => user.permissions.includes(p));
  }, [user]);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, hasPermission, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
