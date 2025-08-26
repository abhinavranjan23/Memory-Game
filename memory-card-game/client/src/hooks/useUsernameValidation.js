import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const useUsernameValidation = (initialUsername = "") => {
  const [username, setUsername] = useState(initialUsername);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [message, setMessage] = useState("");
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Debounced username check
  const checkUsernameAvailability = useCallback(async (usernameToCheck) => {
    if (!usernameToCheck || usernameToCheck.trim().length < 4) {
      setIsAvailable(null);
      setMessage("");
      return;
    }

    // Check for valid characters (letters, numbers, hyphens, underscores only)
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernameRegex.test(usernameToCheck.trim())) {
      setIsAvailable(false);
      setMessage(
        "Username can only contain letters, numbers, hyphens (-), and underscores (_)"
      );
      return;
    }

    setIsChecking(true);
    try {
      const response = await axios.get(
        `/auth/check-username/${encodeURIComponent(usernameToCheck.trim())}`
      );
      setIsAvailable(response.data.available);
      setMessage(response.data.message);
    } catch (error) {
      console.error("Username check error:", error);
      setIsAvailable(false);
      setMessage(
        error.response?.data?.message || "Error checking username availability"
      );
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Debounced effect - only run if user has interacted
  useEffect(() => {
    if (!hasUserInteracted) return;

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500); // 500ms debounce

    setDebounceTimer(timer);

    // Cleanup
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [username, checkUsernameAvailability, hasUserInteracted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const updateUsername = (newUsername) => {
    setUsername(newUsername);
    setHasUserInteracted(true);
  };

  const resetValidation = () => {
    setIsAvailable(null);
    setMessage("");
    setIsChecking(false);
    setHasUserInteracted(false);
  };

  return {
    username,
    updateUsername,
    isChecking,
    isAvailable,
    message,
    resetValidation,
    isValid: isAvailable === true,
    hasError: isAvailable === false,
  };
};

export default useUsernameValidation;
