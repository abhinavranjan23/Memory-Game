import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import useErrorHandler from "../hooks/useErrorHandler.js";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import axios from "axios";
import DashboardShimmer from "../components/DashboardShimmer.jsx";
import { useSocket } from "../contexts/SocketContext.jsx";
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
  SparklesIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, TextPlugin);

const Dashboard = () => {
  const { user, token, ensureTokenSet, isProperlyAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { handleError, handleApiCall } = useErrorHandler();
  const navigate = useNavigate();
  const { socket, joinRoom } = useSocket();
  // Refs for GSAP animations
  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const activityRef = useRef(null);
  const achievementsRef = useRef(null);
  const quickPlayRef = useRef(null);

  const [stats, setStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickPlayLoading, setQuickPlayLoading] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({
    gamesPlayed: 0,
    winRate: 0,
    bestScore: 0,
    perfectGames: 0,
  });

  useEffect(() => {
    if (isProperlyAuthenticated && isProperlyAuthenticated()) {
      fetchDashboardData();
    }
  }, [user, token]);

  // GSAP Animations
  useEffect(() => {
    if (!loading && stats) {
      // Initialize animations after data loads
      initializeAnimations();
    }

    // Cleanup function to kill ScrollTriggers when component unmounts
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [loading, stats]);

  const initializeAnimations = () => {
    // Header animation with text reveal
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: -50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
      }
    );

    // Animate welcome text
    gsap.fromTo(
      ".welcome-text",
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 0.3,
        ease: "power2.out",
      }
    );

    // Stats cards stagger animation
    gsap.fromTo(
      ".stat-card",
      { opacity: 0, y: 50, scale: 0.8 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: statsRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      }
    );

    // Animate stat numbers
    animateStatNumbers();

    // Activity section animation
    gsap.fromTo(
      activityRef.current,
      { opacity: 0, x: -50 },
      {
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: activityRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      }
    );

    // Achievements section animation
    gsap.fromTo(
      achievementsRef.current,
      { opacity: 0, x: 50 },
      {
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: achievementsRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      }
    );

    // Quick play button animation
    gsap.fromTo(
      quickPlayRef.current,
      { opacity: 0, scale: 0.5, rotation: -180 },
      {
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: 1,
        delay: 0.5,
        ease: "elastic.out(1, 0.3)",
      }
    );
  };

  const animateStatNumbers = () => {
    const finalStats = {
      gamesPlayed: stats?.gamesPlayed || 0,
      winRate: Math.round(stats?.winRate || 0),
      bestScore: stats?.bestScore || 0,
      perfectGames: stats?.perfectGames || 0,
    };

    // Animate each stat number
    Object.keys(finalStats).forEach((key, index) => {
      gsap.to(
        {},
        {
          duration: 2,
          delay: 0.5 + index * 0.2,
          onUpdate: function () {
            const progress = this.progress();
            const currentValue = Math.floor(finalStats[key] * progress);
            setAnimatedStats((prev) => ({
              ...prev,
              [key]: currentValue,
            }));
          },
          ease: "power2.out",
        }
      );
    });
  };

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
      if (socket) {
        const joinData = { roomId: response.data.game.roomId };
        const success = joinRoom(joinData);
        if (!success) {
          addToast("Failed to join room ", "error");
          navigate("/lobby");
        }

        let hasNavigated = false;

        const navigateToWaiting = () => {
          if (!hasNavigated) {
            hasNavigated = true;
            navigate(`/waiting/${response.data.game.roomId}`);
          }
        };

        socket.once("room-joined", (data) => {
          addToast("Taking you to the room...", "info");
          navigateToWaiting();
        });

        socket.once("join-room-error", (error) => {
          console.log("Dashboard: join-room-error received:", error);

          if (error.message && error.message.includes("blocked")) {
            addToast(
              "Your account has been blocked due to suspicious activity. Please contact an administrator.",
              "error"
            );
            navigate("/lobby");
          } else {
            addToast(error.message || "Failed to join room", "error");
            navigate("/lobby");
          }
        });

        socket.once("error", (error) => {
          console.log("Dashboard: socket error received:", error);

          if (error.message && error.message.includes("blocked")) {
            addToast(
              "Your account has been blocked due to suspicious activity. Please contact an administrator.",
              "error"
            );
            navigate("/lobby");
          } else {
            addToast(error.message || "Socket error occurred", "error");
            navigate("/lobby");
          }
        });

        const timeoutId = setTimeout(() => {
          addToast("Taking you to the room...", "info");
          navigateToWaiting();
        }, 3000);

        socket.once("room-joined", () => {
          clearTimeout(timeoutId);
        });
      } else {
        addToast("Failed to join room", "error");
        navigate("/lobby");
      }
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

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
    trend,
    statKey,
  }) => {
    const cardRef = useRef(null);

    const handleMouseEnter = () => {
      gsap.to(cardRef.current, {
        scale: 1.05,
        y: -10,
        duration: 0.3,
        ease: "power2.out",
      });

      // Animate icon
      gsap.to(cardRef.current.querySelector(".stat-icon"), {
        rotation: 360,
        scale: 1.2,
        duration: 0.5,
        ease: "back.out(1.7)",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(cardRef.current, {
        scale: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
      });

      // Reset icon
      gsap.to(cardRef.current.querySelector(".stat-icon"), {
        rotation: 0,
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    return (
      <div
        ref={cardRef}
        className='stat-card bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 cursor-pointer transform transition-all duration-300 hover:shadow-2xl mt-8'
        style={{ borderLeftColor: color, borderLeftWidth: "4px" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-bold text-gray-600 dark:text-gray-300 tracking-wide uppercase'>
              {title}
            </p>
            <p className='text-4xl font-black text-gray-900 dark:text-white tracking-tight mt-1'>
              {statKey ? animatedStats[statKey] : value}
              {title === "Win Rate" && "%"}
            </p>
            {subtitle && (
              <p className='text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 tracking-wide'>
                {subtitle}
              </p>
            )}
          </div>
          <div
            className='stat-icon p-4 rounded-2xl shadow-lg transform transition-all duration-300'
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className='h-8 w-8' style={{ color }} />
          </div>
        </div>
        {trend && (
          <div className='mt-4 flex items-center'>
            <ArrowTrendingUpIcon className='h-4 w-4 text-green-500 mr-2 animate-pulse' />
            <span className='text-sm font-bold text-green-500'>{trend}</span>
          </div>
        )}
      </div>
    );
  };

  if (loading || !user) {
    return <DashboardShimmer />;
  }

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-8'>
      {/* Welcome Header */}
      <div
        ref={headerRef}
        className='bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden'
      >
        {/* Animated background elements */}
        <div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16'></div>
        <div className='absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12'></div>

        <div className='flex flex-col md:flex-row justify-between items-start md:items-center relative z-10'>
          <div>
            <h1 className='welcome-text text-4xl md:text-5xl font-black mb-3 tracking-tight'>
              Welcome back, {user?.username}! 👋
            </h1>
            <p className='welcome-text text-blue-100 text-lg md:text-xl font-medium tracking-wide'>
              Ready to challenge your memory? Let's see what you can achieve
              today! 🚀
            </p>
          </div>
          <div className='mt-6 md:mt-0 flex flex-col sm:flex-row gap-3'>
            <button
              ref={quickPlayRef}
              onClick={quickPlay}
              disabled={quickPlayLoading}
              className='bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg
                       hover:bg-blue-50 hover:scale-105 transition-all duration-300 flex items-center
                       disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl'
            >
              {quickPlayLoading ? (
                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3'></div>
              ) : (
                <RocketLaunchIcon className='h-6 w-6 mr-3' />
              )}
              Quick Play
            </button>
            <button
              onClick={() => navigate("/lobby")}
              className='bg-purple-500 hover:bg-purple-400 text-white px-8 py-4 rounded-2xl 
                       font-bold text-lg transition-all duration-300 flex items-center shadow-lg hover:shadow-xl hover:scale-105'
            >
              <UsersIcon className='h-6 w-6 mr-3' />
              Browse Lobby
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div
        ref={statsRef}
        className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
      >
        <StatCard
          title='Games Played'
          value={stats?.gamesPlayed || 0}
          icon={PuzzlePieceIcon}
          color='#3B82F6'
          subtitle='Total matches'
          statKey='gamesPlayed'
        />
        <StatCard
          title='Win Rate'
          value={`${Math.round(stats?.winRate || 0)}%`}
          icon={TrophyIcon}
          color='#10B981'
          subtitle={`${stats?.gamesWon || 0} victories`}
          trend={stats?.winRate > 50 ? "+5% this week" : null}
          statKey='winRate'
        />
        <StatCard
          title='Best Score'
          value={stats?.bestScore || 0}
          icon={StarIcon}
          color='#F59E0B'
          subtitle='Personal record'
          statKey='bestScore'
        />
        <StatCard
          title='Perfect Games'
          value={stats?.perfectGames || 0}
          icon={FireIcon}
          color='#EF4444'
          subtitle='Flawless victories'
          statKey='perfectGames'
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Recent Activity */}
        <div className='lg:col-span-2'>
          <div
            ref={activityRef}
            className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700'
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
                        {match.completionReason && (
                          <div className='mt-1 text-sm'>
                            {(() => {
                              const reasonMap = {
                                game_completed: {
                                  text: "✅ All pairs found",
                                  color: "text-green-600",
                                },
                                timeout_no_matches: {
                                  text: "⏰ Time ran out - No matches",
                                  color: "text-orange-600",
                                },
                                timeout_with_matches: {
                                  text: "⏰ Time ran out - With matches",
                                  color: "text-orange-600",
                                },
                                sudden_death_winner: {
                                  text: "⚡ Sudden Death winner",
                                  color: "text-purple-600",
                                },
                                sudden_death_timeout: {
                                  text: "⚡ Sudden Death timeout",
                                  color: "text-orange-600",
                                },
                                opponents_left: {
                                  text: "⚠️ Opponents left",
                                  color: "text-orange-600",
                                },
                                last_player_winner: {
                                  text: "👑 Last player wins",
                                  color: "text-blue-600",
                                },
                                all_players_left: {
                                  text: "🚪 All players left",
                                  color: "text-gray-600",
                                },
                                blitz_timeout: {
                                  text: "⏰ Blitz mode timeout",
                                  color: "text-orange-600",
                                },
                                abort: {
                                  text: "❌ Game aborted",
                                  color: "text-red-600",
                                },
                              };
                              const reason = reasonMap[
                                match.completionReason
                              ] || {
                                text: `Game ended: ${match.completionReason}`,
                                color: "text-gray-600",
                              };
                              return (
                                <span className={reason.color}>
                                  {reason.text}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className='space-y-6'>
          {/* Quick Actions */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Quick Actions
            </h3>
            <div className='space-y-4'>
              <button
                onClick={() => navigate("/lobby")}
                className='w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 
                         hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-lg transition-all duration-300 
                         transform hover:scale-105 hover:shadow-lg'
              >
                <UsersIcon className='h-6 w-6 mr-3' />
                Join Game
              </button>
              <button
                onClick={() => navigate("/leaderboard")}
                className='w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 
                         hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold text-lg transition-all duration-300 
                         transform hover:scale-105 hover:shadow-lg'
              >
                <ChartBarIcon className='h-6 w-6 mr-3' />
                Leaderboard
              </button>
              <button
                onClick={() => navigate("/profile")}
                className='w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 
                         hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-bold text-lg transition-all duration-300 
                         transform hover:scale-105 hover:shadow-lg'
              >
                <EyeIcon className='h-6 w-6 mr-3' />
                View Profile
              </button>
            </div>
          </div>

          {/* Achievements Preview */}
          <div
            ref={achievementsRef}
            className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700'
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
          </div>

          {/* Daily Tip */}
          <div className='bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-2xl p-6 shadow-xl'>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
