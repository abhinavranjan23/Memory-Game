import React from 'react';
import { useParams } from 'react-router-dom';

const Game: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Memory Game
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Room: {roomId}
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
          <p className="text-gray-600 dark:text-gray-300">
            🎮 Coming soon! The game interface with cards, timer, chat, and all the features.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Game;