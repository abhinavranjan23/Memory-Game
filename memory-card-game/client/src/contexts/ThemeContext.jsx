import React, { createContext, useContext, useEffect, useState } from "react";
import { useCookieConsent } from "../hooks/useCookieConsent";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { canStore, hasConsent } = useCookieConsent();

  const [isDark, setIsDark] = useState(() => {
    // Always try to read from localStorage first
    const saved = localStorage.getItem("theme");
    if (saved) {
      return saved === "dark";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (hasConsent) {
      const saved = localStorage.getItem("theme");
      if (saved) {
        setIsDark(saved === "dark");
      }
    }
  }, [hasConsent]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");

      if (canStore("preferences")) {
        localStorage.setItem("theme", "dark");
      }
    } else {
      document.documentElement.classList.remove("dark");

      if (canStore("preferences")) {
        localStorage.setItem("theme", "light");
      }
    }
  }, [isDark, canStore]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
