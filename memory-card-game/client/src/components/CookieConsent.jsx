import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consentGiven = localStorage.getItem("cookieConsent");
    if (!consentGiven) {
      setShowConsent(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("cookieConsent", "all");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setShowConsent(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem("cookieConsent", "essential");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setShowConsent(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookieConsent", "declined");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    // Clear non-essential data
    localStorage.removeItem("theme");
    localStorage.removeItem("serverLoadingPopupDismissed");
    localStorage.removeItem("serverLoadingPopupNeverShow");
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className='fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 p-4'
      >
        <div className='max-w-4xl mx-auto'>
          <div className='flex items-start justify-between'>
            <div className='flex-1'>
              <div className='flex items-center mb-2'>
                <InformationCircleIcon className='h-5 w-5 text-blue-500 mr-2' />
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                  Cookie & Privacy Notice
                </h3>
              </div>

              <p className='text-sm text-gray-600 dark:text-gray-300 mb-4'>
                We use cookies and local storage to enhance your gaming
                experience, remember your preferences, and provide secure
                authentication. By continuing to use our site, you consent to
                our use of cookies.
              </p>

              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className='mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'
                >
                  <h4 className='font-medium text-gray-900 dark:text-white mb-2'>
                    What we store:
                  </h4>
                  <ul className='text-sm text-gray-600 dark:text-gray-300 space-y-1'>
                    <li>
                      • <strong>Authentication tokens</strong> - For secure
                      login sessions
                    </li>
                    <li>
                      • <strong>Theme preference</strong> - Your dark/light mode
                      choice
                    </li>
                    <li>
                      • <strong>UI preferences</strong> - Popup dismissal
                      settings
                    </li>
                    <li>
                      • <strong>Game progress</strong> - Your current game state
                    </li>
                  </ul>
                </motion.div>
              )}

              <div className='flex flex-col sm:flex-row gap-2'>
                <button
                  onClick={handleAcceptAll}
                  className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium'
                >
                  Accept All
                </button>
                <button
                  onClick={handleAcceptEssential}
                  className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium'
                >
                  Essential Only
                </button>
                <button
                  onClick={handleDecline}
                  className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium'
                >
                  Decline
                </button>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className='px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium'
                >
                  {showDetails ? "Hide Details" : "Show Details"}
                </button>
              </div>
            </div>

            <button
              onClick={handleAcceptAll}
              className='ml-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
            >
              <XMarkIcon className='h-5 w-5' />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieConsent;
