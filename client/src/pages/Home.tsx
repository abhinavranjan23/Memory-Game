import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-16">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Memory Masters
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Challenge your memory in exciting multiplayer card games! Play with friends, 
          unlock achievements, and climb the leaderboards in this next-generation memory game.
        </p>
        
        {user ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/lobby"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Play Now
            </Link>
            <Link
              to="/dashboard"
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Login
            </Link>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 py-16">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🧠</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Memory Training
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Improve your memory skills with engaging card matching games across multiple difficulty levels.
          </p>
        </div>

        <div className="text-center p-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👥</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Multiplayer Fun
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Play with friends in real-time multiplayer matches or join public rooms to meet new players.
          </p>
        </div>

        <div className="text-center p-6">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏆</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Achievements
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Unlock achievements, track your progress, and compete on global leaderboards.
          </p>
        </div>
      </div>

      {/* Game Modes Section */}
      <div className="py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Game Modes
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="text-center mb-4">
              <span className="text-4xl">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
              Classic Mode
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
              Traditional memory game with turn-based gameplay.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="text-center mb-4">
              <span className="text-4xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
              Blitz Mode
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
              Fast-paced 60-second memory challenges.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="text-center mb-4">
              <span className="text-4xl">💥</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
              Sudden Death
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
              Tie-breaker rounds with single-pair elimination.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="text-center mb-4">
              <span className="text-4xl">🎮</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
              Power-Up Frenzy
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
              Use special abilities like peek, swap, and freeze.
            </p>
          </div>
        </div>
      </div>

      {/* Power-ups Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Power-Ups & Abilities
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center p-4">
            <div className="text-4xl mb-2">🔄</div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Extra Turn</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Get another turn even if you miss</p>
          </div>
          
          <div className="text-center p-4">
            <div className="text-4xl mb-2">👁️</div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Peek</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Briefly see all unmatched cards</p>
          </div>
          
          <div className="text-center p-4">
            <div className="text-4xl mb-2">🔀</div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Card Swap</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Swap positions of two cards</p>
          </div>
          
          <div className="text-center p-4">
            <div className="text-4xl mb-2">💡</div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Reveal One</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Permanently reveal one card</p>
          </div>
          
          <div className="text-center p-4">
            <div className="text-4xl mb-2">❄️</div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Time Freeze</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Freeze the timer for 10 seconds</p>
          </div>
          
          <div className="text-center p-4">
            <div className="text-4xl mb-2">🌀</div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Shuffle Cards</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Shuffle all unmatched cards</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center py-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Ready to Test Your Memory?
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Join thousands of players and start your memory training journey today!
        </p>
        
        {!user && (
          <Link
            to="/register"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
          >
            Start Playing Now
          </Link>
        )}
      </div>
    </div>
  );
};

export default Home;