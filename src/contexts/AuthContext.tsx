import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthUser {
  id: string;
  username: string;
  name: string;
  fullName: string;
  role: 'admin' | 'employee';
  email?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (userData: AuthUser, token: string) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('stockpilot-user');
      const storedToken = localStorage.getItem('stockpilot-token');
      
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('stockpilot-user');
      localStorage.removeItem('stockpilot-token');
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData: AuthUser, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('stockpilot-user', JSON.stringify(userData));
    localStorage.setItem('stockpilot-token', authToken);
    
    // Navigate to the originally requested page or dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  }, [navigate, location]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('stockpilot-user');
    localStorage.removeItem('stockpilot-token');
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const isAuthPath = location.pathname === '/login' || location.pathname === '/register';

    if (!loading && !user && !isAuthPath) {
      navigate('/login', { state: { from: location } });
    }
    
    if (!loading && user && isAuthPath) {
      navigate('/dashboard');
    }
  }, [user, loading, location, navigate]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
} 