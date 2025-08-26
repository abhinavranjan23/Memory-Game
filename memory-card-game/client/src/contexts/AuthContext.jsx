import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Setup axios defaults
axios.defaults.baseURL = API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // Set auth header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("token", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("token");
    }
  }, [token]);

  // Ensure token is properly set before allowing API calls
  const ensureTokenSet = async () => {
    if (token && !axios.defaults.headers.common["Authorization"]) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  // Check if user is properly authenticated
  const isProperlyAuthenticated = () => {
    return (
      user && user.id && token && axios.defaults.headers.common["Authorization"]
    );
  };

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get("/auth/me");
          setUser(response.data.user);
        } catch (error) {
          console.error("Failed to load user:", error);
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (emailOrUsername, password) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { emailOrUsername, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const { token: newToken, user: userData } = response.data;

      // Set token first, then user to ensure axios headers are updated
      setToken(newToken);

      // Wait for token to be set in axios headers before setting user
      setTimeout(() => {
        setUser(userData);
      }, 50);
    } catch (error) {
      console.error("Login error details:", error);
      throw new Error(error.response?.data?.message || "Login failed");
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/register`,
        { username, email, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const { token: newToken, user: userData } = response.data;

      // Set token first, then user to ensure axios headers are updated
      setToken(newToken);

      // Wait for token to be set in axios headers before setting user
      setTimeout(() => {
        setUser(userData);
      }, 50);
    } catch (error) {
      console.error("Registration error details:", error);
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  };

  const loginAsGuest = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/guest`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const { token: newToken, user: userData } = response.data;

      // Set token first, then user to ensure axios headers are updated
      setToken(newToken);

      // Wait for token to be set in axios headers before setting user
      setTimeout(() => {
        setUser(userData);
      }, 50);
    } catch (error) {
      console.error("Guest login error details:", error);
      throw new Error(error.response?.data?.message || "Guest login failed");
    }
  };

  const googleLogin = async (googleData) => {
    try {
      const response = await axios.post("/auth/google", {
        googleId: googleData.googleId,
        email: googleData.email,
        name: googleData.name,
        picture: googleData.picture,
      });
      const { token: newToken, user: userData } = response.data;

      // Set token first, then user to ensure axios headers are updated
      setToken(newToken);

      // Wait for token to be set in axios headers before setting user
      setTimeout(() => {
        setUser(userData);
      }, 50);
    } catch (error) {
      throw new Error(error.response?.data?.message || "Google login failed");
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post("/auth/logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await axios.patch("/auth/profile", data);
      setUser(response.data.user);
    } catch (error) {
      throw new Error(error.response?.data?.message || "Profile update failed");
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
    isAuthenticated: !!user,
    ensureTokenSet,
    isProperlyAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
