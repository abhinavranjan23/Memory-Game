import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import useErrorHandler from "../hooks/useErrorHandler.js";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrophyIcon,
  FireIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

const Leaderboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { handleApiCall } = useErrorHandler();
  const [activeTab, setActiveTab] = useState("totalScore");
  const [timeFilter, setTimeFilter] = useState("all");
  const [leaderboards, setLeaderboards] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [globalStats, setGlobalStats] = useState({});

  const tabs = [
    {
      id: "totalScore",
      name: "Top Scores",
      icon: TrophyIcon,
      description: "Players with highest total scores",
    },
    {
      id: "winRate",
      name: "Win Rate",
      icon: FireIcon,
      description: "Players with best win percentages",
    },
    {
      id: "gamesPlayed",
      name: "Most Active",
      icon: ClockIcon,
      description: "Players with most games played",
    },
  ];

  const timeFilters = [
    { id: "all", name: "All Time" },
    { id: "week", name: "This Week" },
    { id: "month", name: "This Month" },
  ];

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchLeaderboard();
    fetchGlobalStats();
  }, [activeTab, timeFilter, page]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await handleApiCall(
        () =>
          axios.get("/game/leaderboard/global", {
            params: {
              limit: 50,
              page,
              timeframe: timeFilter,
            },
          }),
        null,
        "Failed to load leaderboard data"
      );

      setLeaderboards(response.data.leaderboards);
      setHasMore(response.data.pagination.hasMore);
    } catch (error) {
      // Error already handled by handleApiCall
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalStats = async () => {
    try {
      const response = await handleApiCall(
        () => axios.get("/game/stats/global"),
        null,
        "Failed to load global statistics"
      );
      setGlobalStats(response.data.statistics);
    } catch (error) {
      // Error already handled by handleApiCall
    }
  };

  const getCurrentLeaderboard = () => {
    return leaderboards[activeTab] || [];
  };

  const filteredLeaderboard = getCurrentLeaderboard().filter((player) =>
    player.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const getRankIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "text-gray-600 dark:text-gray-400";
  };

  const isCurrentUser = (playerId) => {
    return user && (user.id === playerId || user._id === playerId);
  };

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 mt-8'>
      {/* Header */}
      <div className='text-center'>
        <motion.h1
          className='text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2'
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          🏆 Leaderboard
        </motion.h1>
        <p className='text-sm sm:text-base text-gray-600 dark:text-gray-300'>
          Compete with the best Memory Masters from around the world
        </p>
      </div>

      {/* Global Stats */}
      {globalStats.totalPlayers && (
        <motion.div
          className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6'
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className='bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 rounded-lg'>
            <div className='flex items-center'>
              <UserGroupIcon className='h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3' />
              <div>
                <p className='text-xs sm:text-sm opacity-90'>Total Players</p>
                <p className='text-lg sm:text-2xl font-bold'>
                  {globalStats.totalPlayers?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className='bg-gradient-to-r from-green-500 to-green-600 text-white p-3 sm:p-4 rounded-lg'>
            <div className='flex items-center'>
              <ChartBarIcon className='h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3' />
              <div>
                <p className='text-xs sm:text-sm opacity-90'>Games Played</p>
                <p className='text-lg sm:text-2xl font-bold'>
                  {globalStats.totalGames?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className='bg-gradient-to-r from-purple-500 to-purple-600 text-white p-3 sm:p-4 rounded-lg'>
            <div className='flex items-center'>
              <FireIcon className='h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3' />
              <div>
                <p className='text-xs sm:text-sm opacity-90'>Active Games</p>
                <p className='text-lg sm:text-2xl font-bold'>
                  {globalStats.activeGames}
                </p>
              </div>
            </div>
          </div>
          <div className='bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 sm:p-4 rounded-lg'>
            <div className='flex items-center'>
              <ClockIcon className='h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3' />
              <div>
                <p className='text-xs sm:text-sm opacity-90'>Avg Game Time</p>
                <p className='text-lg sm:text-2xl font-bold'>
                  {globalStats.averageGameDuration
                    ? (() => {
                        const seconds = Math.round(
                          globalStats.averageGameDuration / 1000
                        );
                        if (seconds < 60) {
                          return `${seconds}s`;
                        } else if (seconds < 3600) {
                          const minutes = Math.floor(seconds / 60);
                          const remainingSeconds = seconds % 60;
                          return `${minutes}m ${remainingSeconds}s`;
                        } else {
                          const hours = Math.floor(seconds / 3600);
                          const minutes = Math.floor((seconds % 3600) / 60);
                          return `${hours}h ${minutes}m`;
                        }
                      })()
                    : "0s"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters and Search */}
      <motion.div
        className='bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className='flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:gap-4 lg:items-center lg:justify-between'>
          {/* Tabs */}
          <div className='flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1'>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`
                  flex items-center px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors
                  ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }
                `}
              >
                <tab.icon className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                <span className='hidden sm:inline'>{tab.name}</span>
                <span className='sm:hidden'>{tab.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Search and Time Filter */}
          <div className='flex flex-col sm:flex-row gap-3'>
            <div className='relative'>
              <MagnifyingGlassIcon className='h-5 w-5 absolute left-3 top-3 text-gray-400' />
              <input
                type='text'
                placeholder='Search by username...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
              />
            </div>

            <select
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value);
                setPage(1);
              }}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'
            >
              {timeFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.name}
                </option>
              ))}
            </select>

            {user && (
              <Link
                to='/profile'
                className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center text-sm'
              >
                <ClockIcon className='h-4 w-4 mr-2' />
                <span className='hidden sm:inline'>My History</span>
                <span className='sm:hidden'>History</span>
              </Link>
            )}
          </div>
        </div>

        {/* Tab Description and Search Results */}
        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 space-y-2 sm:space-y-0'>
          <div className='flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4'>
            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
              {tabs.find((tab) => tab.id === activeTab)?.description}
            </p>
          </div>
          {debouncedSearchTerm && (
            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
              {filteredLeaderboard.length} result
              {filteredLeaderboard.length !== 1 ? "s" : ""} found
            </p>
          )}
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        className='bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {loading ? (
          <div className='flex items-center justify-center p-12'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className='text-center p-12'>
            <TrophyIcon className='h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
            <p className='text-gray-500 dark:text-gray-400'>
              {debouncedSearchTerm
                ? `No players found matching "${debouncedSearchTerm}".`
                : "No leaderboard data available."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className='hidden lg:block overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-700'>
                  <tr>
                    <th className='px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      Rank
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      Player
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      {activeTab === "totalScore"
                        ? "Total Score"
                        : activeTab === "winRate"
                        ? "Win Rate"
                        : "Games Played"}
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      Games
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      Win Rate
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  <AnimatePresence>
                    {filteredLeaderboard.map((player, index) => (
                      <motion.tr
                        key={player.username}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`
                        hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                        ${
                          isCurrentUser(player.id)
                            ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                            : ""
                        }
                      `}
                      >
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div
                            className={`text-xl font-bold ${getRankColor(
                              player.rank
                            )}`}
                          >
                            {getRankIcon(player.rank)}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center'>
                            <div className='flex-shrink-0 h-10 w-10'>
                              <div className='h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold'>
                                {player.username.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className='ml-4'>
                              <div className='flex items-center'>
                                <div className='text-sm font-medium text-gray-900 dark:text-white'>
                                  {player.username}
                                  {isCurrentUser(player.id) && (
                                    <span className='ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'>
                                      You
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='text-sm font-bold text-gray-900 dark:text-white'>
                            {activeTab === "totalScore"
                              ? player.totalScore?.toLocaleString()
                              : activeTab === "winRate"
                              ? `${Math.round(player.winRate || 0)}%`
                              : player.gamesPlayed?.toLocaleString()}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='text-sm text-gray-500 dark:text-gray-400'>
                            {player.gamesPlayed?.toLocaleString()}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center'>
                            <div className='text-sm text-gray-500 dark:text-gray-400'>
                              {Math.round(player.winRate || 0)}%
                            </div>
                            <div className='ml-3 w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2'>
                              <div
                                className='bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300'
                                style={{
                                  width: `${Math.min(
                                    Math.round(player.winRate || 0),
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className='lg:hidden space-y-3 p-4'>
              <AnimatePresence>
                {filteredLeaderboard.map((player, index) => (
                  <motion.div
                    key={player.username}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`
                    bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border
                    ${
                      isCurrentUser(player.id)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-600"
                    }
                  `}
                  >
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center space-x-3'>
                        <div
                          className={`text-2xl font-bold ${getRankColor(
                            player.rank
                          )}`}
                        >
                          {getRankIcon(player.rank)}
                        </div>
                        <div className='flex items-center'>
                          <div className='h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold'>
                            {player.username.charAt(0).toUpperCase()}
                          </div>
                          <div className='ml-3'>
                            <div className='flex items-center'>
                              <div className='text-sm font-medium text-gray-900 dark:text-white'>
                                {player.username}
                                {isCurrentUser(player.id) && (
                                  <span className='ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'>
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className='grid grid-cols-2 gap-4 text-sm'>
                      <div>
                        <p className='text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider'>
                          {activeTab === "totalScore"
                            ? "Total Score"
                            : activeTab === "winRate"
                            ? "Win Rate"
                            : "Games Played"}
                        </p>
                        <p className='font-bold text-gray-900 dark:text-white'>
                          {activeTab === "totalScore"
                            ? player.totalScore?.toLocaleString()
                            : activeTab === "winRate"
                            ? `${Math.round(player.winRate || 0)}%`
                            : player.gamesPlayed?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className='text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider'>
                          Games
                        </p>
                        <p className='text-gray-900 dark:text-white'>
                          {player.gamesPlayed?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className='mt-3'>
                      <div className='flex items-center justify-between mb-1'>
                        <p className='text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider'>
                          Win Rate
                        </p>
                        <p className='text-sm text-gray-900 dark:text-white'>
                          {Math.round(player.winRate || 0)}%
                        </p>
                      </div>
                      <div className='w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2'>
                        <div
                          className='bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300'
                          style={{
                            width: `${Math.min(
                              Math.round(player.winRate || 0),
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Load More */}
        {hasMore && !loading && filteredLeaderboard.length > 0 && (
          <div className='p-4 sm:p-6 text-center border-t border-gray-200 dark:border-gray-700'>
            <button
              onClick={() => setPage(page + 1)}
              className='w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base'
            >
              Load More Players
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Leaderboard;
