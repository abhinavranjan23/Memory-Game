import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GameLoadingScreen = () => {
  // State for managing loading messages and tips
  const [loadingText, setLoadingText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showCards, setShowCards] = useState(false);

  // Array of gaming-themed loading messages
  const loadingMessages = [
    "🎮 Loading Memory Masters...",
    "🧠 Preparing your brain workout...",
    "🎯 Setting up the game board...",
    "⚡ Charging up the power-ups...",
    "🌟 Connecting to the game server...",
    "🎪 Almost ready to play...",
    "🚀 Launching your adventure...",
  ];

  // Array of helpful gaming tips
  const gamingTips = [
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
  ];

  // Effect 1: Cycle through loading messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Effect 2: Cycle through tips every 4 seconds (slower than messages)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % gamingTips.length);
    }, 4000); // 4 seconds per tip

    return () => clearInterval(interval);
  }, []);

  // Effect 3: Typewriter effect for current message
  useEffect(() => {
    const message = loadingMessages[currentIndex];
    let index = 0;
    setLoadingText("");

    const typeInterval = setInterval(() => {
      if (index < message.length) {
        setLoadingText((prev) => prev + message[index]);
        index++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [currentIndex]);

  // Effect 4: Show cards after initial delay
  useEffect(() => {
    const timer = setTimeout(() => setShowCards(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Card symbols for the memory game theme
  const cardSymbols = ["", "", "", "⚡", "🌟", "🎪", "", ""];

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center overflow-hidden relative'>
      {/* Animated background particles */}
      <div className='absolute inset-0 overflow-hidden'>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute w-2 h-2 bg-white/20 rounded-full'
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main loading content */}
      <div className='relative z-10 text-center'>
        {/* Game logo/title */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className='mb-8'
        >
          <h1 className='text-6xl font-black text-white mb-4 tracking-tight'>
            Memory Masters
          </h1>
          <div className='w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full' />
        </motion.div>

        {/* Animated cards */}
        <AnimatePresence>
          {showCards && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className='flex justify-center gap-4 mb-8'
            >
              {cardSymbols.slice(0, 4).map((symbol, index) => (
                <motion.div
                  key={index}
                  className='w-16 h-20 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 flex items-center justify-center text-2xl shadow-lg'
                  animate={{
                    y: [0, -10, 0],
                    rotateY: [0, 180, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.2,
                  }}
                  whileHover={{ scale: 1.1 }}
                >
                  {symbol}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading spinner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className='mb-6'
        >
          <div className='relative'>
            {/* Outer ring */}
            <motion.div
              className='w-20 h-20 border-4 border-white/20 rounded-full mx-auto'
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            {/* Inner ring */}
            <motion.div
              className='absolute top-2 left-2 w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full'
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            {/* Center dot */}
            <motion.div
              className='absolute top-1/2 left-1/2 w-3 h-3 bg-purple-400 rounded-full transform -translate-x-1/2 -translate-y-1/2'
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Loading text with typewriter effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className='mb-4'
        >
          <div className='h-8 flex items-center justify-center'>
            <span className='text-white/90 text-lg font-medium'>
              {loadingText}
              {/* Blinking cursor */}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className='ml-1'
              >
                |
              </motion.span>
            </span>
          </div>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className='w-64 h-2 bg-white/20 rounded-full mx-auto overflow-hidden mb-8'
        >
          <motion.div
            className='h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full'
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Cycling gaming tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className='mt-8'
        >
          <AnimatePresence mode='wait'>
            <motion.div
              key={currentTipIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className='text-white/70 text-sm max-w-md mx-auto px-4'
            >
              <p className='flex items-center justify-center gap-2'>
                <span className='text-lg'>💡</span>
                <span>
                  {gamingTips[currentTipIndex].replace("🎮 Tip: ", "")}
                </span>
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Tip counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className='mt-4 text-white/40 text-xs'
        >
          Tip {currentTipIndex + 1} of {gamingTips.length}
        </motion.div>
      </div>

      {/* Floating elements */}
      <div className='absolute inset-0 pointer-events-none'>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute text-4xl opacity-20'
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + (i % 2) * 80}%`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          >
            {cardSymbols[i % cardSymbols.length]}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default GameLoadingScreen;
