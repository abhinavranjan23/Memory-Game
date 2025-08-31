import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useCookieConsent } from "../hooks/useCookieConsent";

const AuthContext = createContext();

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Setup axios defaults
axios.defaults.baseURL = API_BASE_URL;

const AuthProvider = ({ children }) => {
  const { canStore, hasConsent } = useCookieConsent();

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    // Always try to read from localStorage first
    return localStorage.getItem("token");
  });
  const [refreshToken, setRefreshToken] = useState(() => {
    // Always try to read from localStorage first
    return localStorage.getItem("refreshToken");
  });
  const [loading, setLoading] = useState(true);

  // Update tokens when consent changes
  useEffect(() => {
    if (hasConsent) {
      // If user has given consent, read from localStorage
      const savedToken = localStorage.getItem("token");
      const savedRefreshToken = localStorage.getItem("refreshToken");

      // Only restore tokens if they exist and we don't already have them
      // This prevents auto-restoration after logout
      if (savedToken && !token) {
        setToken(savedToken);
      }
      if (savedRefreshToken && !refreshToken) {
        setRefreshToken(savedRefreshToken);
      }
    }
  }, [hasConsent, token, refreshToken]);

  // Set auth header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Only save to localStorage if user has given consent for essential cookies
      if (canStore("essential")) {
        localStorage.setItem("token", token);
      }
    } else {
      delete axios.defaults.headers.common["Authorization"];
      if (canStore("essential")) {
        localStorage.removeItem("token");
      }
    }
  }, [token, canStore]);

  // Store refresh token when it changes
  useEffect(() => {
    if (refreshToken) {
      // Only save to localStorage if user has given consent for essential cookies
      if (canStore("essential")) {
        localStorage.setItem("refreshToken", refreshToken);
      }
    } else {
      if (canStore("essential")) {
        localStorage.removeItem("refreshToken");
      }
    }
  }, [refreshToken, canStore]);

  // Ensure token is properly set before allowing API calls
  const ensureTokenSet = async () => {
    if (token && !axios.defaults.headers.common["Authorization"]) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Small delay to ensure headers are set
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };

  // Check if user is properly authenticated
  const isProperlyAuthenticated = () => {
    return (
      user && user.id && token && axios.defaults.headers.common["Authorization"]
    );
  };

  // Refresh access token using refresh token
  const refreshAccessToken = async () => {
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await axios.post("/auth/refresh", {
        refreshToken: refreshToken,
      });

      const { tokens } = response.data;
      setToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);

      return tokens.accessToken;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // Clear tokens on refresh failure
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      throw error;
    }
  };

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          await ensureTokenSet();
          const response = await axios.get("/auth/me");
          setUser(response.data.user);
        } catch (error) {
          console.error("Failed to load user:", error);

          // Try to refresh token if we have a refresh token
          if (refreshToken && error.response?.status === 401) {
            try {
              await refreshAccessToken();
              // Retry loading user after token refresh
              const retryResponse = await axios.get("/auth/me");
              setUser(retryResponse.data.user);
            } catch (refreshError) {
              console.error("Failed to refresh token:", refreshError);
              setToken(null);
              setRefreshToken(null);
              setUser(null);
            }
          } else {
            setToken(null);
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token, refreshToken]);

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
      const {
        token: newToken,
        refreshToken: newRefreshToken,
        user: userData,
      } = response.data;

      // Set token, refresh token and user atomically
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(userData);
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
      const {
        token: newToken,
        refreshToken: newRefreshToken,
        user: userData,
      } = response.data;

      // Set token, refresh token and user atomically
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(userData);
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
      const {
        token: newToken,
        refreshToken: newRefreshToken,
        user: userData,
      } = response.data;

      // Set token, refresh token and user atomically
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(userData);
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
      const {
        token: newToken,
        refreshToken: newRefreshToken,
        user: userData,
      } = response.data;

      // Set token, refresh token and user atomically
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(userData);
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
      // Clear tokens and user state
      setToken(null);
      setRefreshToken(null);
      setUser(null);

      // Clear localStorage immediately to prevent auto-restoration
      if (canStore("essential")) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
      }

      // Clear axios headers
      delete axios.defaults.headers.common["Authorization"];
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

// Export both the provider and hook
export { AuthProvider };

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { useAuth };
