import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";

const ServerLoadingPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [serverStatus, setServerStatus] = useState("checking");
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    const neverShow = localStorage.getItem("serverLoadingPopupNeverShow");
    if (neverShow === "true") {
      setIsDismissed(true);
      return;
    }

    checkServerStatus();

    const showPopupTimer = setTimeout(() => {
      if (!hasCheckedOnce || serverStatus === "loading") {
        setIsVisible(true);
      }
    }, 5000);

    const loadingTimer = setInterval(() => {
      setLoadingTime((prev) => prev + 1);
    }, 1000);

    checkIntervalRef.current = setInterval(() => {
      if (isVisible && serverStatus === "loading") {
        checkServerStatus();
      }
    }, 10000);

    return () => {
      clearTimeout(showPopupTimer);
      clearInterval(loadingTimer);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  const checkServerStatus = async () => {
    if (serverStatus === "ready") return;

    setServerStatus("checking");
    setHasCheckedOnce(true);

    try {
      const startTime = Date.now();
      const response = await fetch(
        `https://memory-game-mogf.onrender.com/health`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          // Short timeout for quick detection
          signal: AbortSignal.timeout(3000), // Reduced timeout
        }
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        setServerStatus("ready");

        if (responseTime < 2000) {
          setIsVisible(false);
          setIsDismissed(true);
        }
      } else {
        setServerStatus("loading");
      }
    } catch (error) {
      setServerStatus("loading");
      console.log("Server health check failed:", error.message);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem("serverLoadingPopupDismissed", "true");
  };

  const handleDontShowAgain = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem("serverLoadingPopupDismissed", "true");
    localStorage.setItem("serverLoadingPopupNeverShow", "true");
  };

  const getStatusMessage = () => {
    switch (serverStatus) {
      case "checking":
        return "Checking server status...";
      case "loading":
        return "Server is waking up...";
      case "ready":
        return "Server is ready!";
      default:
        return "Server status unknown";
    }
  };

  const getStatusColor = () => {
    switch (serverStatus) {
      case "checking":
        return "text-blue-500";
      case "loading":
        return "text-amber-500";
      case "ready":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  if (isDismissed || (serverStatus === "ready" && !isVisible)) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className='relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700'
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
            >
              <XMarkIcon className='w-6 h-6' />
            </button>

            {/* Header */}
            <div className='flex items-center space-x-3 mb-4'>
              <div className='flex-shrink-0'>
                <ServerIcon className='w-8 h-8 text-blue-500' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                  Server Status
                </h3>
                <p className={`text-sm ${getStatusColor()}`}>
                  {getStatusMessage()}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className='space-y-4'>
              <div className='flex items-start space-x-3'>
                <ExclamationTriangleIcon className='w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='text-sm text-gray-700 dark:text-gray-300'>
                    This application is hosted on a{" "}
                    <span className='font-semibold text-amber-600'>
                      free tier server
                    </span>
                    .
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                    Initial loading may take up to{" "}
                    <span className='font-semibold'>1 minute</span> due to
                    server sleep mode.
                  </p>
                </div>
              </div>

              <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3'>
                <div className='flex items-center space-x-2'>
                  <CheckCircleIcon className='w-4 h-4 text-blue-500' />
                  <span className='text-xs text-blue-700 dark:text-blue-300'>
                    Subsequent requests will be much faster once the server is
                    awake!
                  </span>
                </div>
              </div>

              {loadingTime > 0 && (
                <div className='text-center'>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Loading time: {loadingTime}s
                  </p>
                </div>
              )}

              {/* Manual refresh button */}
              <div className='text-center'>
                <button
                  onClick={checkServerStatus}
                  disabled={serverStatus === "checking"}
                  className='text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  {serverStatus === "checking"
                    ? "Checking..."
                    : "Check server status"}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className='flex flex-col space-y-2 mt-6'>
              <button
                onClick={handleDismiss}
                className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200'
              >
                Got it, thanks!
              </button>
              <button
                onClick={handleDontShowAgain}
                className='w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm transition-colors duration-200'
              >
                Don't show again
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ServerLoadingPopup;
