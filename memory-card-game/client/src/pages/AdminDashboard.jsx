import React from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import useErrorHandler from "../hooks/useErrorHandler.js";
import axios from "axios";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { handleApiCall } = useErrorHandler();

  const handleCleanup = async () => {
    try {
      const response = await handleApiCall(
        () => axios.post("/game/cleanup"),
        null,
        "Failed to cleanup old games"
      );

      addToast({
        type: "success",
        title: "Cleanup Completed",
        message: `Successfully cleaned up ${response.data.deletedCount} old games. Found ${response.data.oldGamesCount} old games before cleanup.`,
      });
    } catch (error) {
      // Error already handled by handleApiCall
    }
  };

  return (
    <div className='max-w-7xl mx-auto space-y-6'>
      <div className='text-center mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-4'>
          AdminDashboard
        </h1>
      </div>
      {/* Admin Actions */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-4'>
          Admin Actions
        </h2>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {/* Cleanup Button */}
          <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
            <h3 className='text-lg font-semibold text-red-800 dark:text-red-200 mb-2'>
              Database Cleanup
            </h3>
            <p className='text-sm text-red-600 dark:text-red-300 mb-4'>
              Remove old inactive games that haven't been updated in the last
              hour
            </p>
            <button
              onClick={handleCleanup}
              className='w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors'
            >
              Cleanup Old Games
            </button>
          </div>

          {/* Add more admin actions here */}
        </div>
      </div>

      <div className='bg-white dark:bg-gray-800 rounded-lg p-8 text-center'>
        <p className='text-gray-600 dark:text-gray-300'>
          This page is under development.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
