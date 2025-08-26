import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import useErrorHandler from "../hooks/useErrorHandler.js";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
  PlayIcon,
  TrophyIcon,
  UsersIcon,
  ChartBarIcon,
  ClockIcon,
  FireIcon,
  LightBulbIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  PuzzlePieceIcon,
  BoltIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const Dashboard = () => {
  const { user, token, ensureTokenSet, isProperlyAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { handleError, handleApiCall } = useErrorHandler();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickPlayLoading, setQuickPlayLoading] = useState(false);

  useEffect(() => {
    if (isProperlyAuthenticated && isProperlyAuthenticated()) {
      fetchDashboardData();
    }
  }, [user, token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Check if user is properly authenticated
      if (!isProperlyAuthenticated || !isProperlyAuthenticated()) {
        return;
      }

      // Ensure token is properly set before making API calls
      if (ensureTokenSet) {
        await ensureTokenSet();
      }

      // Fetch user stats, recent matches, and achievements in parallel
      const [statsResponse, matchesResponse, userStatsResponse] =
        await Promise.all([
          handleApiCall(
            () => axios.get("/game/stats/user"),
            null,
            "Failed to load user stats"
          ),
          handleApiCall(
            () => axios.get("/game/history/matches?limit=5"),
            null,
            "Failed to load recent matches"
          ),
          handleApiCall(
            () => axios.get("/user/stats"),
            null,
            "Failed to load user achievements"
          ),
        ]);

      // Combine game stats with user stats for complete statistics
      const gameStats = statsResponse.data.statistics;
      const userStats = userStatsResponse.data.stats;

      // Merge stats, prioritizing user stats for fields that exist there
      const combinedStats = {
        ...gameStats,
        gamesPlayed: userStats?.gamesPlayed || gameStats.gamesPlayed,
        gamesWon: userStats?.gamesWon || gameStats.gamesWon,
        winRate: userStats?.winRate || gameStats.winRate,
        totalScore: userStats?.totalScore || gameStats.totalScore,
        perfectGames: userStats?.perfectGames || gameStats.perfectGames,
        powerUpsUsed: userStats?.powerUpsUsed || gameStats.powerUpsUsed,
        bestMatchStreak:
          userStats?.bestMatchStreak || gameStats.longestMatchStreak,
        averageFlipTime:
          userStats?.averageFlipTime || gameStats.averageFlipTime,
        // Calculate average score from total score and games played
        averageScore:
          userStats?.gamesPlayed > 0
            ? Math.round(userStats.totalScore / userStats.gamesPlayed)
            : gameStats.averageScore,
        // Use best score from user stats if available, otherwise from game stats
        bestScore: userStats?.bestScore || gameStats.bestScore,
      };
      setStats(combinedStats);
      setRecentMatches(matchesResponse.data.matches);

      // Use real achievements from backend and add missing fields for UI compatibility
      const realAchievements = userStatsResponse.data.achievements || [];

      const processedAchievements = realAchievements.map((achievement) => ({
        ...achievement,
        unlocked: true, // All achievements in the database are unlocked
      }));
      setAchievements(processedAchievements);
    } catch (error) {
      // Errors already handled by handleApiCall
    } finally {
      setLoading(false);
    }
  };

  const quickPlay = async () => {
    setQuickPlayLoading(true);
    try {
      // Create a quick play room with default settings
      const response = await handleApiCall(
        () =>
          axios.post("/game/create", {
            isPrivate: false,
            settings: {
              maxPlayers: 2,
              boardSize: "4x4",
              gameMode: "classic",
              theme: "emojis",
              powerUpsEnabled: true,
            },
          }),
        "Quick play room created!",
        "Failed to create quick play room"
      );

      navigate(`/game/${response.data.game.roomId}`);
    } catch (error) {
      // Error already handled
    } finally {
      setQuickPlayLoading(false);
    }
  };

  const getGameModeIcon = (mode) => {
    switch (mode) {
      case "blitz":
        return <ClockIcon className='h-4 w-4' />;
      case "sudden-death":
        return <FireIcon className='h-4 w-4' />;
      default:
        return <TrophyIcon className='h-4 w-4' />;
    }
  };

  const getResultColor = (result) => {
    return result === "won"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border-l-4'
      style={{ borderLeftColor: color }}
    >
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm font-medium text-gray-600 dark:text-gray-300'>
            {title}
          </p>
          <p className='text-3xl font-bold text-gray-900 dark:text-white'>
            {value}
          </p>
          {subtitle && (
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`p-3 rounded-full`}
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className='h-8 w-8' style={{ color }} />
        </div>
      </div>
      {trend && (
        <div className='mt-4 flex items-center'>
          <ArrowTrendingUpIcon className='h-4 w-4 text-green-500 mr-1' />
          <span className='text-sm text-green-500'>{trend}</span>
        </div>
      )}
    </motion.div>
  );

  if (loading || !user) {
    return (
      <div className='max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto space-y-6'>
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className='bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8'
      >
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center'>
          <div>
            <h1 className='text-4xl font-bold mb-2'>
              Welcome back, {user?.username}! 👋
            </h1>
            <p className='text-blue-100 text-lg'>
              Ready to challenge your memory? Let's see what you can achieve
              today!
            </p>
          </div>
          <div className='mt-4 md:mt-0 flex gap-3'>
            <button
              onClick={quickPlay}
              disabled={quickPlayLoading}
              className='bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold
                       hover:bg-blue-50 transition-colors duration-200 flex items-center
                       disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {quickPlayLoading ? (
                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2'></div>
              ) : (
                <BoltIcon className='h-5 w-5 mr-2' />
              )}
              Quick Play
            </button>
            <button
              onClick={() => navigate("/lobby")}
              className='bg-purple-500 hover:bg-purple-400 text-white px-6 py-3 rounded-lg 
                       font-semibold transition-colors duration-200 flex items-center'
            >
              <UsersIcon className='h-5 w-5 mr-2' />
              Browse Lobby
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <StatCard
          title='Games Played'
          value={stats?.gamesPlayed || 0}
          icon={PuzzlePieceIcon}
          color='#3B82F6'
          subtitle='Total matches'
        />
        <StatCard
          title='Win Rate'
          value={`${Math.round(stats?.winRate || 0)}%`}
          icon={TrophyIcon}
          color='#10B981'
          subtitle={`${stats?.gamesWon || 0} victories`}
          trend={stats?.winRate > 50 ? "+5% this week" : null}
        />
        <StatCard
          title='Best Score'
          value={stats?.bestScore || 0}
          icon={StarIcon}
          color='#F59E0B'
          subtitle='Personal record'
        />
        <StatCard
          title='Perfect Games'
          value={stats?.perfectGames || 0}
          icon={FireIcon}
          color='#EF4444'
          subtitle='Flawless victories'
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Recent Activity */}
        <div className='lg:col-span-2'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className='bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden'
          >
            <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
                  Recent Matches
                </h2>
                <button
                  onClick={() => navigate("/profile")}
                  className='text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center'
                >
                  View All
                  <ArrowRightIcon className='h-4 w-4 ml-1' />
                </button>
              </div>
            </div>

            <div className='divide-y divide-gray-200 dark:divide-gray-700'>
              {recentMatches.length === 0 ? (
                <div className='p-8 text-center'>
                  <PuzzlePieceIcon className='h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3' />
                  <p className='text-gray-500 dark:text-gray-400'>
                    No recent matches
                  </p>
                  <p className='text-sm text-gray-400 dark:text-gray-500 mt-1'>
                    Start playing to see your match history here!
                  </p>
                </div>
              ) : (
                recentMatches.map((match, index) => (
                  <motion.div
                    key={match.gameId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className='p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-4'>
                        <div className='flex items-center space-x-2'>
                          {getGameModeIcon(match.gameMode)}
                          <span className='font-medium text-gray-900 dark:text-white'>
                            {match.gameMode} • {match.boardSize}
                          </span>
                        </div>
                        <span
                          className={`font-semibold ${getResultColor(
                            match.result
                          )}`}
                        >
                          {match.result.toUpperCase()}
                        </span>
                      </div>
                      <div className='text-right'>
                        <p className='text-sm font-medium text-gray-900 dark:text-white'>
                          {match.score} pts
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {formatDuration(match.duration)}
                        </p>
                      </div>
                    </div>

                    <div className='mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300'>
                      <div className='flex items-center space-x-4'>
                        <span>{match.matches} matches</span>
                        <span>{match.flips} flips</span>
                        <span>{match.playerCount} players</span>
                      </div>
                      <span className='text-xs text-gray-400 dark:text-gray-500'>
                        {new Date(match.playedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Show opponents and completion reason */}
                    {match.opponents && match.opponents.length > 0 && (
                      <div className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                        <span className='font-medium'>Opponents: </span>
                        {match.opponents.map((opponent, idx) => (
                          <span key={idx}>
                            {opponent.username} ({opponent.score} pts)
                            {opponent.leftEarly && (
                              <span className='text-orange-500 ml-1'>
                                • left
                              </span>
                            )}
                            {idx < match.opponents.length - 1 ? ", " : ""}
                          </span>
                        ))}
                        {(match.completionReason === "opponents_left" || 
                          match.completionReason === "last_player_winner" ||
                          match.completionReason === "abort") && (
                          <div className='mt-1 text-orange-500'>
                            ⚠️ Game ended early - {match.completionReason === "abort" ? "game aborted" : "opponents left"}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <div className='space-y-6'>
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'
          >
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Quick Actions
            </h3>
            <div className='space-y-3'>
              <button
                onClick={() => navigate("/lobby")}
                className='w-full flex items-center justify-center px-4 py-3 bg-blue-600 
                         hover:bg-blue-700 text-white rounded-lg font-medium transition-colors'
              >
                <UsersIcon className='h-5 w-5 mr-2' />
                Join Game
              </button>
              <button
                onClick={() => navigate("/leaderboard")}
                className='w-full flex items-center justify-center px-4 py-3 bg-green-600 
                         hover:bg-green-700 text-white rounded-lg font-medium transition-colors'
              >
                <ChartBarIcon className='h-5 w-5 mr-2' />
                Leaderboard
              </button>
              <button
                onClick={() => navigate("/profile")}
                className='w-full flex items-center justify-center px-4 py-3 bg-purple-600 
                         hover:bg-purple-700 text-white rounded-lg font-medium transition-colors'
              >
                <EyeIcon className='h-5 w-5 mr-2' />
                View Profile
              </button>
            </div>
          </motion.div>

          {/* Achievements Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'
          >
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                Achievements
              </h3>
              <button
                onClick={() => navigate("/profile")}
                className='text-blue-600 hover:text-blue-700 text-sm font-medium'
              >
                View All
              </button>
            </div>

            <div className='space-y-3'>
              {achievements.slice(0, 3).map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className={`flex items-center space-x-3 p-3 rounded-lg ${
                    achievement.unlocked
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-gray-50 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`text-2xl ${
                      achievement.unlocked ? "" : "grayscale opacity-50"
                    }`}
                  >
                    {achievement.iconUrl}
                  </span>
                  <div className='flex-1 min-w-0'>
                    <p
                      className={`font-medium text-sm ${
                        achievement.unlocked
                          ? "text-green-900 dark:text-green-100"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {achievement.name}
                    </p>
                    <p
                      className={`text-xs ${
                        achievement.unlocked
                          ? "text-green-600 dark:text-green-300"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <StarIcon className='h-4 w-4 text-yellow-500' />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Daily Tip */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className='bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-lg p-6'
          >
            <div className='flex items-start space-x-3'>
              <LightBulbIcon className='h-6 w-6 text-yellow-100 flex-shrink-0 mt-0.5' />
              <div>
                <h3 className='font-semibold mb-2'>💡 Daily Tip</h3>
                <p className='text-sm text-yellow-100'>
                  Try to create visual patterns or stories with the cards you
                  remember. This technique can dramatically improve your memory
                  performance!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
