import React from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

const AdminDashboard = () => {
  const { user } = useAuth();
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          AdminDashboard
        </h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-300">
          This page is under development.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
