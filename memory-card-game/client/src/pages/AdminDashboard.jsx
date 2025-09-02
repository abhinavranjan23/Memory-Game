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
  ArrowPathIcon,
  XCircleIcon,
  EyeIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { handleApiCall } = useErrorHandler();
  const [antiCheatReport, setAntiCheatReport] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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

  const fetchBlockedUsers = async () => {
    try {
      const response = await handleApiCall(
        () => axios.get("/admin/anti-cheat/blocked-users"),
        null,
        "Failed to fetch blocked users"
      );
      setBlockedUsers(response.data.blockedUsers);
    } catch (error) {
      // Error already handled by handleApiCall
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      const reason = prompt(
        "Please provide a reason for unblocking this user:"
      );
      if (reason === null) return; // User cancelled

      await handleApiCall(
        () => axios.post(`/admin/anti-cheat/unblock/${userId}`, { reason }),
        "User unblocked successfully",
        "Failed to unblock user"
      );

      // Refresh both reports
      fetchAntiCheatReport();
      fetchBlockedUsers();
    } catch (error) {
      // Error already handled by handleApiCall
    }
  };

  const handleRefreshCache = async () => {
    try {
      await handleApiCall(
        () => axios.post("/admin/anti-cheat/refresh-cache"),
        "Cache refreshed successfully",
        "Failed to refresh cache"
      );
      // Refresh both reports
      fetchAntiCheatReport();
      fetchBlockedUsers();
    } catch (error) {
      // Error already handled by handleApiCall
    }
  };

  useEffect(() => {
    fetchAntiCheatReport();
    fetchBlockedUsers();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getDaysAgo = (dateString) => {
    const days = Math.floor(
      (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

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
          {/* Cache Refresh Button */}
          <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
            <h3 className='text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2'>
              Refresh Cache
            </h3>
            <p className='text-sm text-blue-600 dark:text-blue-300 mb-4'>
              Refresh anti-cheat system cache to sync with database
            </p>
            <button
              onClick={handleRefreshCache}
              className='w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors'
            >
              <ArrowPathIcon className='h-4 w-4 inline mr-2' />
              Refresh Cache
            </button>
          </div>
        </div>
      </div>

      {/* Anti-Cheat Monitoring */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg'>
        {/* Header Section */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
          <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center'>
            <ShieldExclamationIcon className='h-5 w-5 sm:h-6 sm:w-6 mr-2 text-red-500 flex-shrink-0' />
            Anti-Cheat Monitoring
          </h2>

          {/* Button Group */}
          <div className='flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto'>
            <button
              onClick={fetchAntiCheatReport}
              disabled={loading}
              className='flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base'
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className='border-b border-gray-200 dark:border-gray-700 mb-6'>
          <nav className='-mb-px flex space-x-8'>
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("blocked-users")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "blocked-users"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Blocked Users ({blockedUsers.length})
            </button>
            <button
              onClick={() => setActiveTab("suspicious-activity")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "suspicious-activity"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Suspicious Activity
            </button>
          </nav>
        </div>

        {antiCheatReport ? (
          <div className='space-y-6'>
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                {/* Summary Cards */}
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
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
                          Blocked Users (Cache)
                        </p>
                        <p className='text-xl sm:text-2xl font-bold text-orange-800 dark:text-orange-200'>
                          {antiCheatReport.blockedUsers}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4'>
                    <div className='flex items-center'>
                      <Cog6ToothIcon className='h-6 w-6 sm:h-8 sm:w-8 text-purple-500 mr-3 flex-shrink-0' />
                      <div className='min-w-0 flex-1'>
                        <p className='text-sm text-purple-600 dark:text-purple-300'>
                          Blocked Users (DB)
                        </p>
                        <p className='text-xl sm:text-2xl font-bold text-purple-800 dark:text-purple-200'>
                          {antiCheatReport.summary?.activeBlockedUsers || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4'>
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

                {/* Cache Status */}
                {antiCheatReport.cacheStats && (
                  <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600'>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-3'>
                      Cache Status
                    </h3>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                      <div className='text-center'>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>
                          Cache Status
                        </p>
                        <p
                          className={`font-semibold ${
                            antiCheatReport.summary?.cacheStatus?.initialized
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {antiCheatReport.summary?.cacheStatus?.initialized
                            ? "Initialized"
                            : "Not Initialized"}
                        </p>
                      </div>
                      <div className='text-center'>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>
                          Last Cache Refresh
                        </p>
                        <p className='font-semibold text-gray-900 dark:text-white'>
                          {antiCheatReport.summary?.cacheStatus
                            ?.lastCacheRefresh
                            ? formatDate(
                                antiCheatReport.summary.cacheStatus
                                  .lastCacheRefresh
                              )
                            : "Unknown"}
                        </p>
                      </div>
                      <div className='text-center'>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>
                          Last Report Update
                        </p>
                        <p className='font-semibold text-gray-900 dark:text-white'>
                          {antiCheatReport.summary?.lastUpdated
                            ? formatDate(antiCheatReport.summary.lastUpdated)
                            : "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {antiCheatReport.recommendations &&
                  antiCheatReport.recommendations.length > 0 && (
                    <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
                      <h3 className='text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center'>
                        <ExclamationTriangleIcon className='h-5 w-5 mr-2' />
                        Recommendations
                      </h3>
                      <div className='space-y-3'>
                        {antiCheatReport.recommendations.map((rec, index) => (
                          <div
                            key={index}
                            className='bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700'
                          >
                            <div className='flex items-start justify-between'>
                              <div className='flex-1'>
                                <p className='text-sm font-medium text-yellow-800 dark:text-yellow-200'>
                                  {rec.message}
                                </p>
                                {rec.users && rec.users.length > 0 && (
                                  <div className='mt-2 space-y-1'>
                                    {rec.users
                                      .slice(0, 3)
                                      .map((user, uIndex) => (
                                        <p
                                          key={uIndex}
                                          className='text-xs text-yellow-700 dark:text-yellow-300'
                                        >
                                          • {user.userId}{" "}
                                          {user.count &&
                                            `(${user.count} activities)`}
                                          {user.daysBlocked &&
                                            ` - Blocked for ${user.daysBlocked} days`}
                                        </p>
                                      ))}
                                    {rec.users.length > 3 && (
                                      <p className='text-xs text-yellow-600 dark:text-yellow-400'>
                                        ... and {rec.users.length - 3} more
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span
                                className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  rec.type === "high_risk"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                    : rec.type === "blocked_users"
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                                    : rec.type === "cache_mismatch"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                }`}
                              >
                                {rec.type.replace("_", " ").toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            )}

            {/* Blocked Users Tab */}
            {activeTab === "blocked-users" && (
              <div>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                    Blocked Users ({blockedUsers.length})
                  </h3>
                  <button
                    onClick={fetchBlockedUsers}
                    className='px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors'
                  >
                    <ArrowPathIcon className='h-4 w-4 inline mr-2' />
                    Refresh
                  </button>
                </div>

                {blockedUsers.length > 0 ? (
                  <div className='space-y-4'>
                    {blockedUsers.map((user, index) => (
                      <div
                        key={index}
                        className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600'
                      >
                        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
                          <div className='flex-1'>
                            <div className='flex items-center gap-3 mb-2'>
                              <UserIcon className='h-6 w-6 text-gray-500' />
                              <div>
                                <h4 className='font-semibold text-gray-900 dark:text-white'>
                                  {user.username || `User ${user.userId}`}
                                </h4>
                                <p className='text-sm text-gray-600 dark:text-gray-300'>
                                  ID: {user.userId}
                                </p>
                              </div>
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                              <div>
                                <p className='text-gray-600 dark:text-gray-400'>
                                  <span className='font-medium'>Reason:</span>{" "}
                                  {user.reason}
                                </p>
                                <p className='text-gray-600 dark:text-gray-400'>
                                  <span className='font-medium'>Blocked:</span>{" "}
                                  {formatDate(user.blockedAt)}
                                </p>
                                <p className='text-gray-600 dark:text-gray-400'>
                                  <span className='font-medium'>
                                    Days Blocked:
                                  </span>{" "}
                                  {getDaysAgo(user.blockedAt)}
                                </p>
                              </div>
                              <div>
                                <p className='text-gray-600 dark:text-gray-400'>
                                  <span className='font-medium'>
                                    Activities:
                                  </span>{" "}
                                  {user.suspiciousActivityCount}
                                </p>
                                {user.email && (
                                  <p className='text-gray-600 dark:text-gray-400'>
                                    <span className='font-medium'>Email:</span>{" "}
                                    {user.email}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Block History */}
                            {user.blockHistory &&
                              user.blockHistory.length > 1 && (
                                <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-600'>
                                  <p className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                                    Block History ({user.blockHistory.length}{" "}
                                    times)
                                  </p>
                                  <div className='space-y-1'>
                                    {user.blockHistory
                                      .slice(-3)
                                      .map((block, bIndex) => (
                                        <div
                                          key={bIndex}
                                          className='text-xs text-gray-600 dark:text-gray-400'
                                        >
                                          • {formatDate(block.blockedAt)} -{" "}
                                          {block.reason} (
                                          {block.suspiciousActivityCount}{" "}
                                          activities)
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                          </div>

                          <div className='flex flex-col gap-2'>
                            <button
                              onClick={() => handleUnblockUser(user.userId)}
                              className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center'
                            >
                              <CheckCircleIcon className='h-4 w-4 mr-2' />
                              Unblock User
                            </button>
                            <button
                              onClick={() => {
                                // View detailed user info
                                alert(
                                  `User Details:\n\nUsername: ${
                                    user.username || "N/A"
                                  }\nEmail: ${user.email || "N/A"}\nReason: ${
                                    user.reason
                                  }\nBlocked: ${formatDate(
                                    user.blockedAt
                                  )}\nActivities: ${
                                    user.suspiciousActivityCount
                                  }`
                                );
                              }}
                              className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center'
                            >
                              <EyeIcon className='h-4 w-4 mr-2' />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <CheckCircleIcon className='h-12 w-12 text-green-500 mx-auto mb-3' />
                    <p className='text-gray-600 dark:text-gray-300'>
                      No blocked users found. All users are currently active.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Suspicious Activity Tab */}
            {activeTab === "suspicious-activity" && (
              <div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                  Suspicious Activity Details
                </h3>

                {antiCheatReport.details &&
                antiCheatReport.details.length > 0 ? (
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
                                  {formatDate(reason.timestamp)})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <CheckCircleIcon className='h-12 w-12 text-green-500 mx-auto mb-3' />
                    <p className='text-gray-600 dark:text-gray-300'>
                      No suspicious activity detected. All systems are running
                      normally.
                    </p>
                  </div>
                )}
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
