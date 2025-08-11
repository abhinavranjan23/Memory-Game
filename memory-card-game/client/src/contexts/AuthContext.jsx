import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Setup axios defaults
axios.defaults.baseURL = API_BASE_URL;
console.log('API Base URL:', API_BASE_URL);

// Add request interceptor for debugging
axios.interceptors.request.use(request => {
  console.log('Starting Request:', request.url);
  return request;
});

// Add response interceptor for debugging
axios.interceptors.response.use(
  response => {
    console.log('Response:', response);
    return response;
  },
  error => {
    console.error('API Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Set auth header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('Failed to load user:', error);
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      console.log('Attempting login...');
      // Use full URL to avoid any path issues
      const fullUrl = `${API_BASE_URL}/auth/login`;
      console.log('Login URL:', fullUrl);
      
      const response = await axios.post(fullUrl, { email, password }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Login response:', response.data);
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Login error details:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (username, email, password) => {
    try {
      console.log('Attempting registration...');
      // Use full URL to avoid any path issues
      const fullUrl = `${API_BASE_URL}/auth/register`;
      console.log('Register URL:', fullUrl);
      
      const response = await axios.post(fullUrl, { username, email, password }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Registration response:', response.data);
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Registration error details:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const loginAsGuest = async () => {
    try {
      console.log('Attempting guest login...');
      // Use full URL to avoid any path issues
      const fullUrl = `${API_BASE_URL}/auth/guest`;
      console.log('Guest login URL:', fullUrl);
      
      const response = await axios.post(fullUrl, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Guest login response:', response.data);
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Guest login error details:', error);
      throw new Error(error.response?.data?.message || 'Guest login failed');
    }
  };

  const googleLogin = async (googleData) => {
    try {
      const response = await axios.post('/auth/google', {
        googleId: googleData.googleId,
        email: googleData.email,
        name: googleData.name,
        picture: googleData.picture
      });
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Google login failed');
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await axios.patch('/auth/profile', data);
      setUser(response.data.user);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Profile update failed');
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    loginAsGuest,
    googleLogin,
    logout,
    updateProfile,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
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