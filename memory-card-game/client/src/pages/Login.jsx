import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { motion } from "framer-motion";
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const Login = () => {
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, loginAsGuest } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.emailOrUsername, formData.password);
      addToast("Login successful!", "success");
      navigate("/dashboard");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await loginAsGuest();
      addToast("Welcome, guest player!", "success");
      navigate("/dashboard");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className='relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4'>
      {/* Animated background elements */}
      <motion.div
        className='absolute inset-0 overflow-hidden pointer-events-none'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Floating particles */}
        <motion.div
          className='absolute top-20 left-20 w-2 h-2 bg-blue-400/30 rounded-full'
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className='absolute top-40 right-32 w-1 h-1 bg-purple-400/40 rounded-full'
          animate={{
            y: [0, -15, 0],
            x: [0, -8, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className='absolute bottom-32 left-32 w-1.5 h-1.5 bg-indigo-400/35 rounded-full'
          animate={{
            y: [0, -25, 0],
            x: [0, 12, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className='absolute bottom-20 right-20 w-1 h-1 bg-blue-400/25 rounded-full'
          animate={{
            y: [0, -18, 0],
            x: [0, -6, 0],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      <motion.div
        className='w-full max-w-md relative z-10'
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* Main card with animated border */}
        <div className='relative'>
          {/* Animated border */}
          <motion.div
            className='absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-indigo-500/20 backdrop-blur-sm'
            animate={{
              background: [
                "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))",
                "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2), rgba(59, 130, 246, 0.2))",
                "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))",
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Glowing border effect */}
          <motion.div
            className='absolute inset-0 rounded-3xl border-2 border-transparent'
            style={{
              background:
                "linear-gradient(45deg, #3B82F6, #8B5CF6, #6366F1, #3B82F6)",
              backgroundSize: "400% 400%",
            }}
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          <div className='relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl p-6 border border-white/20 dark:border-gray-700/50'>
            {/* Header */}
            <motion.div
              className='text-center mb-6'
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.div
                className='w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center'
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <SparklesIcon className='w-8 h-8 text-white' />
              </motion.div>
              <motion.h1
                className='text-3xl font-black text-gray-900 dark:text-white mb-2'
                animate={{
                  textShadow: [
                    "0 0 0px rgba(59, 130, 246, 0)",
                    "0 0 20px rgba(59, 130, 246, 0.3)",
                    "0 0 0px rgba(59, 130, 246, 0)",
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                Welcome Back
              </motion.h1>
              <p className='text-gray-600 dark:text-gray-300'>
                Sign in to your Memory Masters account
              </p>
            </motion.div>

            <motion.form
              onSubmit={handleSubmit}
              className='space-y-6'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Email/Username field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <label
                  htmlFor='emailOrUsername'
                  className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'
                >
                  Email or Username
                </label>
                <div className='relative'>
                  <UserIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='text'
                    id='emailOrUsername'
                    name='emailOrUsername'
                    value={formData.emailOrUsername}
                    onChange={handleChange}
                    required
                    className='w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-300'
                    placeholder='Enter your email or username'
                  />
                </div>
              </motion.div>

              {/* Password field with eye icon */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <label
                  htmlFor='password'
                  className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'
                >
                  Password
                </label>
                <div className='relative'>
                  <LockClosedIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type={showPassword ? "text" : "password"}
                    id='password'
                    name='password'
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className='w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-300'
                    placeholder='Enter your password'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    {showPassword ? (
                      <EyeSlashIcon className='w-5 h-5' />
                    ) : (
                      <EyeIcon className='w-5 h-5' />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Sign In button */}
              <motion.button
                type='submit'
                disabled={loading}
                className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 text-white py-3 px-4 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-md relative overflow-hidden group'
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                {/* Animated background glow */}
                <motion.div
                  className='absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20'
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                <span className='relative z-10 flex items-center justify-center gap-2'>
                  {loading ? (
                    <>
                      <motion.div
                        className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full'
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRightIcon className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                    </>
                  )}
                </span>
              </motion.button>
            </motion.form>

            {/* Divider */}
            <motion.div
              className='mt-6'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-gray-300 dark:border-gray-600' />
                </div>
                <div className='relative flex justify-center text-sm'>
                  <span className='px-4 bg-white/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-medium'>
                    Or continue as
                  </span>
                </div>
              </div>

              {/* Guest login button */}
              <motion.button
                onClick={handleGuestLogin}
                disabled={loading}
                className='w-full mt-4 bg-white/60 dark:bg-gray-700/60 hover:bg-white/80 dark:hover:bg-gray-700/80 text-gray-900 dark:text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-600 backdrop-blur-sm'
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                Play as Guest
              </motion.button>
            </motion.div>

            {/* Sign up link */}
            <motion.div
              className='mt-6 text-center'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              <p className='text-gray-600 dark:text-gray-300'>
                Don't have an account?{" "}
                <Link
                  to='/register'
                  className='text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors'
                >
                  Sign up here
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
