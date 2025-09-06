import React, { createContext, useContext, useState } from "react";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info", duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast = { id, message, type, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className='fixed top-4 left-1/2 transform -translate-x-1/2 md:top-auto md:bottom-4 md:right-4 md:left-auto md:transform-none z-50 space-y-2 w-full max-w-sm px-4 md:px-0'>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            w-full p-4 rounded-lg shadow-lg transition-all duration-300 transform
            ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : toast.type === "error"
                ? "bg-red-500 text-white"
                : toast.type === "warning"
                ? "bg-yellow-500 text-white"
                : "bg-blue-500 text-white"
            }
          `}
        >
          <div className='flex items-center justify-between'>
            <p className='text-sm font-medium'>{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className='ml-3 text-white hover:text-gray-200'
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
