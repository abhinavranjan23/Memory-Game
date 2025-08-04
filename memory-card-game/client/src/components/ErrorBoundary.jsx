import React from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  HomeIcon,
  BugAntIcon 
} from '@heroicons/react/24/outline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-lg mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8"
            >
              {/* Error Icon */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0, rotate: -10 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="relative">
                  <BugAntIcon className="h-20 w-20 text-red-500" />
                  <motion.div
                    className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Error Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Oops! Something Went Wrong
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Our memory cards seem to have gotten scrambled! Don't worry, 
                  this happens to the best of us. Let's try to fix this.
                </p>
              </motion.div>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-left"
                >
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                    Error Details (Development Mode):
                  </h3>
                  <pre className="text-xs text-red-700 dark:text-red-400 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo.componentStack && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                        Component Stack
                      </summary>
                      <pre className="text-xs text-red-600 dark:text-red-400 mt-1 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleRetry}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 
                             bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium 
                             transition-colors duration-200 focus:outline-none focus:ring-2 
                             focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Try Again {this.state.retryCount > 0 && `(${this.state.retryCount})`}
                  </button>
                  
                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 
                             bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium 
                             transition-colors duration-200 focus:outline-none focus:ring-2 
                             focus:ring-gray-500 focus:ring-offset-2"
                  >
                    <HomeIcon className="h-4 w-4 mr-2" />
                    Go Home
                  </button>
                </div>

                {/* Helpful Tips */}
                <motion.div
                  className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                    🎮 Game Tip:
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Just like flipping the wrong cards in our memory game, 
                    sometimes code needs a second chance. Try refreshing or 
                    check your internet connection!
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;