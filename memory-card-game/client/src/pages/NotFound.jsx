import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HomeIcon, 
  MagnifyingGlassIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* 404 Animation */}
          <div className="mb-8">
            <motion.div
              className="text-8xl font-bold text-gray-300 dark:text-gray-600 mb-4"
              animate={{ 
                rotateY: [0, 10, -10, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              404
            </motion.div>
            
            <motion.div
              className="flex justify-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative">
                <ExclamationTriangleIcon className="h-16 w-16 text-orange-400" />
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ 
                    duration: 1,
                    repeat: Infinity 
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Oops! Page Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              The page you're looking for seems to have disappeared into the memory void. 
              Don't worry, even the best memory masters forget sometimes! 🧠
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 
                         text-white rounded-lg font-medium transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <HomeIcon className="h-5 w-5 mr-2" />
                Go Home
              </Link>
              
              <Link
                to="/dashboard"
                className="inline-flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 
                         text-white rounded-lg font-medium transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Browse Games
              </Link>
            </div>

            {/* Fun Memory Game Reference */}
            <motion.div
              className="mt-8 p-4 bg-gradient-to-r from-purple-100 to-pink-100 
                       dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">
                💡 <strong>Memory Tip:</strong> Just like in our memory card game, 
                sometimes the cards we're looking for aren't where we expect them to be!
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;