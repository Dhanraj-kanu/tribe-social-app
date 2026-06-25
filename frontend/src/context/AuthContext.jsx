import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import { connectSocket, disconnectSocket } from '../utils/socket';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('tribe_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const { data } = await authAPI.getMe();
      setUser(data);
      connectSocket(token);
    } catch (error) {
      console.error('Load user error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials);
    localStorage.setItem('tribe_token', data.token);
    localStorage.setItem('tribe_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    connectSocket(data.token);
    return data;
  };

  const signup = async (userData) => {
    const { data } = await authAPI.signup(userData);
    return data;
  };

  const verifyEmail = async (email, otp) => {
    const { data } = await authAPI.verifyEmail(email, otp);
    localStorage.setItem('tribe_token', data.token);
    localStorage.setItem('tribe_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    connectSocket(data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('tribe_token');
    localStorage.removeItem('tribe_user');
    disconnectSocket();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('tribe_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, verifyEmail, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};
