import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
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
        className='fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-xl z-50 p-3 sm:p-4 md:p-6'
      >
        <div className='max-w-6xl mx-auto'>
          <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
            {/* Main Content */}
            <div className='flex-1 min-w-0'>
              {/* Header */}
              <div className='flex items-start justify-between mb-3'>
                <div className='flex items-center mb-2'>
                  <InformationCircleIcon className='h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mr-2 flex-shrink-0' />
                  <h3 className='text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white leading-tight'>
                    Cookie & Privacy Notice
                  </h3>
                </div>

                {/* Close button - only visible on larger screens */}
                <button
                  onClick={handleAcceptAll}
                  className='hidden lg:block p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0'
                >
                  <XMarkIcon className='h-5 w-5' />
                </button>
              </div>

              {/* Description */}
              <p className='text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 leading-relaxed'>
                We use cookies and local storage to enhance your gaming
                experience, remember your preferences, and provide secure
                authentication. By continuing to use our site, you consent to
                our use of cookies.
              </p>

              {/* Details Section */}
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className='mb-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'
                >
                  <h4 className='font-medium text-gray-900 dark:text-white mb-2 text-sm sm:text-base'>
                    What we store:
                  </h4>
                  <ul className='text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1.5'>
                    <li className='flex items-start'>
                      <span className='text-blue-500 mr-2 mt-0.5'>•</span>
                      <span>
                        <strong>Authentication tokens</strong> - For secure
                        login sessions
                      </span>
                    </li>
                    <li className='flex items-start'>
                      <span className='text-blue-500 mr-2 mt-0.5'>•</span>
                      <span>
                        <strong>Theme preference</strong> - Your dark/light mode
                        choice
                      </span>
                    </li>
                    <li className='flex items-start'>
                      <span className='text-blue-500 mr-2 mt-0.5'>•</span>
                      <span>
                        <strong>UI preferences</strong> - Popup dismissal
                        settings
                      </span>
                    </li>
                    <li className='flex items-start'>
                      <span className='text-blue-500 mr-2 mt-0.5'>•</span>
                      <span>
                        <strong>Game progress</strong> - Your current game state
                      </span>
                    </li>
                  </ul>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className='space-y-3 sm:space-y-0'>
                {/* Primary Actions */}
                <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
                  <button
                    onClick={handleAcceptAll}
                    className='flex-1 px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium shadow-sm hover:shadow-md'
                  >
                    Accept All
                  </button>
                  <button
                    onClick={handleAcceptEssential}
                    className='flex-1 px-4 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base font-medium shadow-sm hover:shadow-md'
                  >
                    Essential Only
                  </button>
                  <button
                    onClick={handleDecline}
                    className='flex-1 px-4 py-2.5 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium shadow-sm hover:shadow-md'
                  >
                    Decline
                  </button>
                </div>

                {/* Secondary Actions */}
                <div className='flex justify-center sm:justify-start'>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className='px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium underline hover:no-underline'
                  >
                    {showDetails ? "Hide Details" : "Show Details"}
                  </button>
                </div>
              </div>
            </div>

            {/* Close button - only visible on mobile */}
            <button
              onClick={handleAcceptAll}
              className='lg:hidden absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
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
