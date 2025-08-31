import { useState, useEffect } from "react";

export const useCookieConsent = () => {
  const [consent, setConsent] = useState(null);
  const [consentDate, setConsentDate] = useState(null);

  useEffect(() => {
    const storedConsent = localStorage.getItem("cookieConsent");
    const storedDate = localStorage.getItem("cookieConsentDate");

    setConsent(storedConsent);
    setConsentDate(storedDate ? new Date(storedDate) : null);
  }, []);

  const canStore = (type) => {
    if (!consent) return false;

    switch (type) {
      case "essential":
        return consent === "all" || consent === "essential";
      case "preferences":
        return consent === "all";
      case "analytics":
        return consent === "all";
      default:
        return consent === "all";
    }
  };

  const updateConsent = (newConsent) => {
    localStorage.setItem("cookieConsent", newConsent);
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setConsent(newConsent);
    setConsentDate(new Date());
  };

  return {
    consent,
    consentDate,
    canStore,
    updateConsent,
    hasConsent: !!consent,
  };
};
