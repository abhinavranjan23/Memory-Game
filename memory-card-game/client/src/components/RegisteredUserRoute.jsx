import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";

const RegisteredUserRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { addToast } = useToast();

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to='/login' replace />;
  }

  // Check if user is a guest
  if (user.isGuest) {
    addToast(
      "This feature is only available for registered users. Please create an account to access your profile and dashboard.",
      "warning"
    );
    return <Navigate to='/lobby' replace />;
  }

  return <>{children}</>;
};

export default RegisteredUserRoute;
