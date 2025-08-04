import React from 'react';

const Lobby: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Game Lobby
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Find or create a game room
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
          <p className="text-gray-600 dark:text-gray-300">
            🚧 Coming soon! The lobby will allow you to join existing games or create new rooms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Lobby;