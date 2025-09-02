import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import useErrorHandler from "../hooks/useErrorHandler.js";
import axios from "axios";
import {
  ShieldExclamationIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { handleApiCall } = useErrorHandler();
  const [antiCheatReport, setAntiCheatReport] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const fetchAntiCheatReport = async () => {
    try {
      setLoading(true);
      const response = await handleApiCall(
        () => axios.get("/admin/anti-cheat/report"),
        null,
        "Failed to fetch anti-cheat report"
      );
      setAntiCheatReport(response.data.report);
    } catch (error) {
      // Error already handled by handleApiCall
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await handleApiCall(
        () => axios.post(`/admin/anti-cheat/unblock/${userId}`),
        "User unblocked successfully",
        "Failed to unblock user"
      );
      // Refresh the report
      fetchAntiCheatReport();
    } catch (error) {
      // Error already handled by handleApiCall
    }
  };

  const handleTestAntiCheat = async () => {
    try {
      await handleApiCall(
        () => axios.get("/admin/anti-cheat/report?demo=true"),
        "Test data loaded successfully",
        "Failed to load test data"
      );
      // Refresh the report
      fetchAntiCheatReport();
    } catch (error) {
      // Error already handled by handleApiCall
    }
  };

  const handleClearTestData = async () => {
    try {
      await handleApiCall(
        () => axios.post("/admin/anti-cheat/clear-test-data"),
        "Test data cleared successfully",
        "Failed to clear test data"
      );
      // Refresh the report
      fetchAntiCheatReport();
    } catch (error) {
      // Error already handled by handleApiCall
    }
  };

  useEffect(() => {
    fetchAntiCheatReport();
  }, []);

  return (
    <div className='max-w-7xl mx-auto space-y-6 p-4 sm:p-6'>
      <div className='text-center mb-8'>
        <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4'>
          Admin Dashboard
        </h1>
      </div>

      {/* Admin Actions */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg'>
        <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4'>
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

      {/* Anti-Cheat Monitoring */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg'>
        {/* Header Section - Made Responsive */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
          <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center'>
            <ShieldExclamationIcon className='h-5 w-5 sm:h-6 sm:w-6 mr-2 text-red-500 flex-shrink-0' />
            Anti-Cheat Monitoring
          </h2>

          {/* Button Group - Made Responsive */}
          <div className='flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto'>
            <button
              onClick={fetchAntiCheatReport}
              disabled={loading}
              className='flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base'
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={handleTestAntiCheat}
              disabled={loading}
              className='flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base'
            >
              Test Data
            </button>
            <button
              onClick={handleClearTestData}
              disabled={loading}
              className='flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base'
            >
              Clear Test
            </button>
          </div>
        </div>

        {antiCheatReport ? (
          <div className='space-y-6'>
            {/* Summary Cards - Made Responsive */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
                <div className='flex items-center'>
                  <ExclamationTriangleIcon className='h-6 w-6 sm:h-8 sm:w-8 text-red-500 mr-3 flex-shrink-0' />
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm text-red-600 dark:text-red-300'>
                      Suspicious Users
                    </p>
                    <p className='text-xl sm:text-2xl font-bold text-red-800 dark:text-red-200'>
                      {antiCheatReport.totalSuspiciousUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className='bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4'>
                <div className='flex items-center'>
                  <XCircleIcon className='h-6 w-6 sm:h-8 sm:w-8 text-orange-500 mr-3 flex-shrink-0' />
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm text-orange-600 dark:text-orange-300'>
                      Blocked Users
                    </p>
                    <p className='text-xl sm:text-2xl font-bold text-orange-800 dark:text-orange-200'>
                      {antiCheatReport.blockedUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 sm:col-span-2 lg:col-span-1'>
                <div className='flex items-center'>
                  <CheckCircleIcon className='h-6 w-6 sm:h-8 sm:w-8 text-green-500 mr-3 flex-shrink-0' />
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm text-green-600 dark:text-green-300'>
                      Status
                    </p>
                    <p className='text-xl sm:text-2xl font-bold text-green-800 dark:text-green-200'>
                      {antiCheatReport.summary?.activeMonitoring
                        ? "Active"
                        : "Inactive"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {antiCheatReport.recommendations &&
              antiCheatReport.recommendations.length > 0 && (
                <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
                  <h3 className='text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2'>
                    Recommendations
                  </h3>
                  <div className='space-y-2'>
                    {antiCheatReport.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className='text-sm text-yellow-700 dark:text-yellow-300'
                      >
                        • {rec.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Detailed Report */}
            {antiCheatReport.details && antiCheatReport.details.length > 0 && (
              <div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                  Suspicious Activity Details
                </h3>
                <div className='space-y-3'>
                  {antiCheatReport.details.map((user, index) => (
                    <div
                      key={index}
                      className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600'
                    >
                      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                        <div className='flex items-start sm:items-center min-w-0 flex-1'>
                          <UserIcon className='h-5 w-5 text-gray-500 mr-2 flex-shrink-0 mt-0.5 sm:mt-0' />
                          <div className='min-w-0 flex-1'>
                            <p className='font-medium text-gray-900 dark:text-white text-sm sm:text-base'>
                              User ID: {user.userId}
                            </p>
                            <p className='text-sm text-gray-600 dark:text-gray-300'>
                              Suspicious Activities: {user.count}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                              Status:{" "}
                              {user.isBlocked ? (
                                <span className='text-red-600 dark:text-red-400'>
                                  Blocked
                                </span>
                              ) : (
                                <span className='text-yellow-600 dark:text-yellow-400'>
                                  Monitored
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className='flex justify-end'>
                          <button
                            onClick={() => handleUnblockUser(user.userId)}
                            disabled={!user.isBlocked}
                            className='px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                          >
                            Unblock
                          </button>
                        </div>
                      </div>
                      {user.reasons && user.reasons.length > 0 && (
                        <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-600'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
                            Recent violations:
                          </p>
                          <div className='space-y-1'>
                            {user.reasons.slice(-3).map((reason, rIndex) => (
                              <div
                                key={rIndex}
                                className='text-xs text-gray-600 dark:text-gray-300 break-words'
                              >
                                • {reason.reason} (
                                {new Date(reason.timestamp).toLocaleString()})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {antiCheatReport.details &&
              antiCheatReport.details.length === 0 && (
                <div className='text-center py-8'>
                  <CheckCircleIcon className='h-12 w-12 text-green-500 mx-auto mb-3' />
                  <p className='text-gray-600 dark:text-gray-300'>
                    No suspicious activity detected. All systems are running
                    normally.
                  </p>
                </div>
              )}
          </div>
        ) : (
          <div className='text-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3'></div>
            <p className='text-gray-600 dark:text-gray-300'>
              Loading anti-cheat report...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
