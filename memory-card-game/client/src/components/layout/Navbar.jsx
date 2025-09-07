import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useTheme } from "../../contexts/ThemeContext.jsx";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMenuOpen(false);
  };

  return (
    <nav className='bg-white dark:bg-gray-800 shadow-lg transition-colors duration-300'>
      <div className='container mx-auto px-4'>
        <div className='flex justify-between items-center h-16'>
          {/* Logo */}
          <Link to='/' className='flex items-center space-x-2'>
            <div className='w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
              <span className='text-white font-bold text-lg'>M</span>
            </div>
            <span className='text-xl font-bold text-gray-900 dark:text-white'>
              Memory Masters
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center space-x-6'>
            <Link
              to='/leaderboard'
              className='text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
            >
              Leaderboard
            </Link>

            {user && (
              <>
                {!user.isGuest && (
                  <Link
                    to='/dashboard'
                    className='text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  to='/lobby'
                  className='text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                >
                  Play
                </Link>
                {user.isAdmin && (
                  <Link
                    to='/admin'
                    className='text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors'
                  >
                    Admin
                  </Link>
                )}
              </>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? "☀️" : "🌙"}
            </button>

            {/* User Menu */}
            {user ? (
              <div className='relative'>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className='flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className='w-8 h-8 rounded-full object-cover'
                    />
                  ) : (
                    <div className='w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold'>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className='text-gray-900 dark:text-white font-medium'>
                    {user.username}
                  </span>
                  <svg
                    className='w-4 h-4 text-gray-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M19 9l-7 7-7-7'
                    />
                  </svg>
                </button>

                {isMenuOpen && (
                  <div className='absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50'>
                    {!user.isGuest && (
                      <Link
                        to='/profile'
                        onClick={() => setIsMenuOpen(false)}
                        className='block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                      >
                        Profile
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className='block w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className='flex items-center space-x-4'>
                <Link
                  to='/login'
                  className='text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                >
                  Login
                </Link>
                <Link
                  to='/register'
                  className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors'
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className='md:hidden flex items-center space-x-2'>
            <button
              onClick={toggleTheme}
              className='p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
              aria-label='Toggle theme'
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className='p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
              aria-label='Toggle menu'
              aria-expanded={isMenuOpen}
            >
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M4 6h16M4 12h16M4 18h16'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className='md:hidden py-4 border-t dark:border-gray-700 fixed top-16 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-lg'>
            <div className='space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto'>
              <Link
                to='/leaderboard'
                onClick={() => setIsMenuOpen(false)}
                className='block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer touch-manipulation'
              >
                Leaderboard
              </Link>
              {user ? (
                <>
                  {!user.isGuest && (
                    <Link
                      to='/dashboard'
                      onClick={() => setIsMenuOpen(false)}
                      className='block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer touch-manipulation'
                    >
                      Dashboard
                    </Link>
                  )}
                  <Link
                    to='/lobby'
                    onClick={() => setIsMenuOpen(false)}
                    className='block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer touch-manipulation'
                  >
                    Play
                  </Link>
                  {!user.isGuest && (
                    <Link
                      to='/profile'
                      onClick={() => setIsMenuOpen(false)}
                      className='block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer touch-manipulation'
                    >
                      Profile
                    </Link>
                  )}
                  {user.isAdmin && (
                    <Link
                      to='/admin'
                      onClick={() => setIsMenuOpen(false)}
                      className='block px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer touch-manipulation'
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className='block w-full text-left px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer touch-manipulation'
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to='/login'
                    onClick={() => setIsMenuOpen(false)}
                    className='block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer touch-manipulation'
                  >
                    Login
                  </Link>
                  <Link
                    to='/register'
                    onClick={() => setIsMenuOpen(false)}
                    className='block px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors cursor-pointer touch-manipulation'
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div
          className='fixed top-16 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-20 md:hidden'
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
