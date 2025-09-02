import React, { useState, useEffect } from "react";

const GameLoadingScreen = () => {
  const [currentTip, setCurrentTip] = useState(0);
  const [bubbleIndex, setBubbleIndex] = useState(0);

  const tips = [
    "💡 Tip: Train your memory daily to improve your score!",
    "🎯 Tip: Focus on patterns to remember card positions faster!",
    "⚡ Tip: Use power-ups strategically to gain advantages!",
    "🧠 Tip: Take breaks between games to keep your mind fresh!",
    "🌟 Tip: Challenge friends to improve your competitive skills!",
    "🎪 Tip: Try different themes to keep the game exciting!",
    "🚀 Tip: Practice with smaller boards before tackling larger ones!",
    "🎮 Tip: Stay calm and focused - speed comes with practice!",
    "🏆 Tip: Aim for perfect matches to unlock achievements!",
    "🎲 Tip: Mix up your strategy - don't always start from the same corner!",
    "⚡ Tip: Remember that every mistake is a learning opportunity!",
    "🌟 Tip: Play regularly to maintain and improve your memory skills!",
    "🎯 Tip: Use the chat feature to coordinate with teammates!",
    "🎲 Tip: Visualize the card layout in your mind's eye!",
    "🎪 Tip: Don't rush - accuracy is more important than speed!",
    "💡 Tip: Match cards quickly to earn bonus points!",
    "🎯 Tip: Use power-ups strategically during gameplay",
    "🏆 Tip: Check the leaderboard to see top players",
    "🎮 Tip: Practice in single-player mode first",
    "⚡ Tip: Quick reflexes help you win more games",
    "🌟 Tip: Complete daily challenges for rewards",
    "🎲 Tip: Different game modes offer unique challenges",
    "📱 Tip: The game works great on mobile devices",
  ];

  // Rotate through tips
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 3000);

    return () => clearInterval(tipInterval);
  }, [tips.length]);

  // Animate loading bubbles
  useEffect(() => {
    const bubbleInterval = setInterval(() => {
      setBubbleIndex((prev) => (prev + 1) % 3);
    }, 500);

    return () => clearInterval(bubbleInterval);
  }, []);

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center'>
      <div className='text-center p-8 max-w-md'>
        {/* Simple Bubble Loading */}
        <div className='flex justify-center items-center space-x-2 mb-8'>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === bubbleIndex
                  ? "bg-indigo-500 scale-125"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Tips Section */}
        <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg'>
          <h3 className='text-lg font-semibold text-gray-800 dark:text-white mb-3'>
            💡 Game Tip
          </h3>
          <p className='text-gray-600 dark:text-gray-300 text-sm leading-relaxed'>
            {tips[currentTip]}
          </p>
          <div className='mt-3 text-xs text-gray-500 dark:text-gray-400'>
            Tip {currentTip + 1} of {tips.length}
          </div>
        </div>

        {/* Loading Text
        <div className='mt-6'>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Please wait while we prepare your game...
          </p>
        </div> */}
      </div>
    </div>
  );
};

export default GameLoadingScreen;
