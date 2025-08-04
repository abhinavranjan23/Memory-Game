import React from 'react';

const Leaderboard: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Leaderboard
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Top Memory Masters
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
          <p className="text-gray-600 dark:text-gray-300">
            🏆 Coming soon! Global rankings, filtered leaderboards, and player statistics.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;