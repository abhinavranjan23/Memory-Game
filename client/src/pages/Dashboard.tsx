import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Ready to challenge your memory skills?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          to="/lobby"
          className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition-colors group"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">🎮</div>
            <h3 className="text-lg font-semibold mb-1">Quick Play</h3>
            <p className="text-sm opacity-90">Join a game now</p>
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Games Played
            </h3>
            <p className="text-2xl font-bold text-blue-600">
              {user?.stats?.gamesPlayed || 0}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Win Rate
            </h3>
            <p className="text-2xl font-bold text-green-600">
              {user?.stats?.winRate?.toFixed(1) || 0}%
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">⭐</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Total Score
            </h3>
            <p className="text-2xl font-bold text-purple-600">
              {user?.stats?.totalScore || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Achievements
          </h2>
          
          {user?.achievements && user.achievements.length > 0 ? (
            <div className="space-y-3">
              {user.achievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex items-center space-x-3">
                  <div className="text-2xl">{achievement.iconUrl}</div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {achievement.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-gray-600 dark:text-gray-300">
                No achievements yet. Start playing to unlock them!
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Game Modes
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Classic</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Turn-based memory game</p>
                </div>
              </div>
              <Link
                to="/lobby?mode=classic"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Play
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Blitz</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">60-second challenge</p>
                </div>
              </div>
              <Link
                to="/lobby?mode=blitz"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Play
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🎮</span>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Power-Up Frenzy</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Use special abilities</p>
                </div>
              </div>
              <Link
                to="/lobby?mode=powerup-frenzy"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Play
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;