import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import useErrorHandler from '../hooks/useErrorHandler.js';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  UserIcon,
  TrophyIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  StarIcon,
  ClockIcon,
  FireIcon,
  LightBulbIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  PencilIcon,
  PhotoIcon,
  EyeIcon,
  EyeSlashIcon,
  PuzzlePieceIcon,
  ShieldCheckIcon,
  BoltIcon,
  HeartIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { handleError, handleApiCall } = useErrorHandler();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    avatar: user?.avatar || ''
  });

  const tabs = [
    { id: 'overview', name: 'Overview', icon: UserIcon },
    { id: 'stats', name: 'Statistics', icon: ChartBarIcon },
    { id: 'achievements', name: 'Achievements', icon: TrophyIcon },
    { id: 'history', name: 'Match History', icon: ClockIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon }
  ];

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      const [statsResponse, matchesResponse] = await Promise.all([
        handleApiCall(() => axios.get('/game/stats/user'), null, 'Failed to load stats'),
        handleApiCall(() => axios.get('/game/history/matches?limit=20'), null, 'Failed to load match history')
      ]);

      setStats(statsResponse.data.statistics);
      setMatches(matchesResponse.data.matches);
      
      // Mock achievements - would come from backend
      setAchievements([
        { 
          id: 'first_win', 
          name: 'First Victory', 
          description: 'Won your first game', 
          iconUrl: '🥇', 
          unlocked: true,
          unlockedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          rarity: 'common'
        },
        { 
          id: 'perfect_memory', 
          name: 'Perfect Memory', 
          description: 'Complete a game without any wrong matches', 
          iconUrl: '🧠', 
          unlocked: false,
          rarity: 'rare'
        },
        { 
          id: 'speed_demon', 
          name: 'Speed Demon', 
          description: 'Win a Blitz mode game under 30 seconds', 
          iconUrl: '⚡', 
          unlocked: true,
          unlockedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          rarity: 'uncommon'
        },
        { 
          id: 'combo_master', 
          name: 'Combo Master', 
          description: 'Get a 5+ match streak', 
          iconUrl: '🔥', 
          unlocked: true,
          unlockedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          rarity: 'uncommon'
        },
        { 
          id: 'social_butterfly', 
          name: 'Social Butterfly', 
          description: 'Play with 10 different players', 
          iconUrl: '🦋', 
          unlocked: false,
          rarity: 'rare'
        },
        { 
          id: 'grandmaster', 
          name: 'Grandmaster', 
          description: 'Win an 8x8 board game', 
          iconUrl: '👑', 
          unlocked: false,
          rarity: 'legendary'
        }
      ]);

    } catch (error) {
      // Errors already handled by handleApiCall
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      await handleApiCall(
        () => updateProfile(profileForm),
        'Profile updated successfully!',
        'Failed to update profile'
      );
      setEditingProfile(false);
    } catch (error) {
      // Error already handled
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'uncommon': return 'border-green-300 bg-green-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getResultColor = (result) => {
    return result === 'won' 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400';
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = '#3B82F6' }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-8"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-24 h-24 rounded-full" />
              ) : (
                user?.username?.charAt(0).toUpperCase()
              )}
            </div>
            {user?.isAdmin && (
              <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full p-1">
                <ShieldCheckIcon className="h-4 w-4" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{user?.username}</h1>
              {!user?.isGuest && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <p className="text-purple-100 mb-4">
              {user?.isGuest ? 'Guest Player' : 'Memory Master'}
              {user?.isAdmin && ' • Administrator'}
            </p>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CalendarDaysIcon className="h-4 w-4" />
                Joined {new Date(user?.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <TrophyIcon className="h-4 w-4" />
                {stats?.gamesWon || 0} Wins
              </div>
              <div className="flex items-center gap-1">
                <StarIcon className="h-4 w-4" />
                {achievements.filter(a => a.unlocked).length} Achievements
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Games Played"
                    value={stats?.gamesPlayed || 0}
                    icon={PuzzlePieceIcon}
                    color="#3B82F6"
                  />
                  <StatCard
                    title="Win Rate"
                    value={`${stats?.winRate || 0}%`}
                    icon={TrophyIcon}
                    color="#10B981"
                  />
                  <StatCard
                    title="Best Score"
                    value={stats?.bestScore || 0}
                    icon={StarIcon}
                    color="#F59E0B"
                  />
                  <StatCard
                    title="Perfect Games"
                    value={stats?.perfectGames || 0}
                    icon={FireIcon}
                    color="#EF4444"
                  />
                </div>

                {/* Recent Achievements */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Achievements
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements
                      .filter(a => a.unlocked)
                      .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
                      .slice(0, 4)
                      .map((achievement) => (
                        <div
                          key={achievement.id}
                          className={`p-4 rounded-lg border-2 ${getRarityColor(achievement.rarity)} 
                                     dark:bg-gray-700 dark:border-gray-600`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-3xl">{achievement.iconUrl}</span>
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {achievement.name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {achievement.description}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatCard
                    title="Total Score"
                    value={stats?.totalScore?.toLocaleString() || 0}
                    subtitle="All-time points"
                    icon={StarIcon}
                    color="#F59E0B"
                  />
                  <StatCard
                    title="Average Score"
                    value={stats?.averageScore || 0}
                    subtitle="Per game"
                    icon={ChartBarIcon}
                    color="#3B82F6"
                  />
                  <StatCard
                    title="Best Score"
                    value={stats?.bestScore || 0}
                    subtitle="Personal record"
                    icon={TrophyIcon}
                    color="#10B981"
                  />
                  <StatCard
                    title="Total Flips"
                    value={stats?.totalFlips || 0}
                    subtitle="Cards revealed"
                    icon={PuzzlePieceIcon}
                    color="#8B5CF6"
                  />
                  <StatCard
                    title="Total Matches"
                    value={stats?.totalMatches || 0}
                    subtitle="Pairs found"
                    icon={HeartIcon}
                    color="#EC4899"
                  />
                  <StatCard
                    title="Accuracy"
                    value={stats?.totalFlips ? `${Math.round((stats.totalMatches * 2 / stats.totalFlips) * 100)}%` : '0%'}
                    subtitle="Match rate"
                    icon={AcademicCapIcon}
                    color="#06B6D4"
                  />
                </div>
              </motion.div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length})
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Progress: {Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100)}%
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <motion.div
                      key={achievement.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-6 rounded-lg border-2 transition-all ${
                        achievement.unlocked
                          ? `${getRarityColor(achievement.rarity)} shadow-md`
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <span 
                          className={`text-4xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}
                        >
                          {achievement.iconUrl}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 dark:text-white">
                              {achievement.name}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              achievement.rarity === 'common' ? 'bg-gray-100 text-gray-800' :
                              achievement.rarity === 'uncommon' ? 'bg-green-100 text-green-800' :
                              achievement.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                              achievement.rarity === 'epic' ? 'bg-purple-100 text-purple-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {achievement.rarity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {achievement.description}
                          </p>
                          {achievement.unlocked ? (
                            <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                              <StarIcon className="h-3 w-3 mr-1" />
                              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              🔒 Locked
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Match History Tab */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Match History ({matches.length} games)
                </h3>

                {matches.length === 0 ? (
                  <div className="text-center py-12">
                    <PuzzlePieceIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No matches played yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Start playing to build your match history!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matches.map((match, index) => (
                      <motion.div
                        key={match.gameId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-4">
                            <span className={`font-bold text-lg ${getResultColor(match.result)}`}>
                              {match.result.toUpperCase()}
                            </span>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <span>{match.gameMode}</span>
                              <span>•</span>
                              <span>{match.boardSize}</span>
                              <span>•</span>
                              <span>{match.playerCount} players</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {match.score} pts
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDuration(match.duration)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-300">
                            <span>{match.matches} matches</span>
                            <span>{match.flips} flips</span>
                            <span>
                              {Math.round((match.matches * 2 / match.flips) * 100) || 0}% accuracy
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(match.playedAt).toLocaleDateString()} at{' '}
                            {new Date(match.playedAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>

                        {match.opponents && match.opponents.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Opponents:</p>
                            <div className="flex flex-wrap gap-2">
                              {match.opponents.map((opponent, i) => (
                                <span 
                                  key={i}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs 
                                           bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                >
                                  {opponent.username} ({opponent.score} pts)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Settings
                </h3>

                {/* Appearance */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Appearance</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Toggle between light and dark theme
                      </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors 
                                 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform 
                                   ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Account Info */}
                {!user?.isGuest && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Account Information</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Username
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={profileForm.username}
                            onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                            disabled={!editingProfile}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                     disabled:bg-gray-100 dark:disabled:bg-gray-700"
                          />
                          {editingProfile ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={saveProfile}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProfile(false);
                                  setProfileForm({
                                    username: user?.username || '',
                                    avatar: user?.avatar || ''
                                  });
                                }}
                                className="px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingProfile(true)}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 
                                       dark:hover:text-gray-200"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                   bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Privacy</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Show Profile in Leaderboards</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Allow other players to see your stats and achievements
                        </p>
                      </div>
                      <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editingProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setEditingProfile(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Edit Profile
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 
                           rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white 
                           rounded-lg font-medium transition-colors duration-200"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
