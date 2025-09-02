import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import useUsernameValidation from "../hooks/useUsernameValidation.js";
import { motion } from "framer-motion";
import { useMobileOptimization } from "../hooks/useMobileOptimization.js";
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Username validation hook
  const usernameValidation = useUsernameValidation("");

  // Get mobile optimization settings
  const { isMobile, isLowEndDevice, getOptimizedAnimations } =
    useMobileOptimization();
  const animations = getOptimizedAnimations();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      addToast("Passwords do not match", "error");
      return;
    }

    if (formData.password.length < 6) {
      addToast("Password must be at least 6 characters", "error");
      return;
    }

    // Check if username is valid
    if (!usernameValidation.isValid) {
      addToast("Please enter a valid username", "error");
      return;
    }

    setLoading(true);
    try {
      await register(formData.username, formData.email, formData.password);
      addToast("Registration successful!", "success");
      navigate("/dashboard");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Update username validation if username field changes
    if (name === "username") {
      usernameValidation.updateUsername(value);
    }
  };

  return (
    <div className='relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4'>
      {/* Animated background elements - only on desktop */}
      {animations.floatingParticles && (
        <motion.div
          className='absolute inset-0 overflow-hidden pointer-events-none'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {/* Floating particles */}
          <motion.div
            className='absolute top-20 left-20 w-2 h-2 bg-green-400/30 rounded-full'
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
            className='absolute top-40 right-32 w-1 h-1 bg-emerald-400/40 rounded-full'
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
            className='absolute bottom-32 left-32 w-1.5 h-1.5 bg-teal-400/35 rounded-full'
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
            className='absolute bottom-20 right-20 w-1 h-1 bg-green-400/25 rounded-full'
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
      )}

      <motion.div
        className='w-full max-w-md relative z-10'
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* Main card with animated border */}
        <div className='relative'>
          {/* Animated border - only on desktop */}
          {animations.backgroundAnimations && (
            <motion.div
              className='absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 backdrop-blur-sm'
              animate={{
                background: [
                  "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))",
                  "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2), rgba(34, 197, 94, 0.2))",
                  "linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))",
                ],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}

          {/* Glowing border effect - only on desktop */}
          {animations.glowEffects && (
            <motion.div
              className='absolute inset-0 rounded-3xl border-2 border-transparent'
              style={{
                background:
                  "linear-gradient(45deg, #22C55E, #10B981, #14B8A6, #22C55E)",
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
          )}

          <div className='relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/50'>
            {/* Header */}
            <motion.div
              className='text-center mb-8'
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.div
                className='w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center'
                whileHover={
                  animations.hoverEffects ? { scale: 1.1, rotate: 5 } : {}
                }
                transition={{ duration: 0.3 }}
              >
                <SparklesIcon className='w-8 h-8 text-white' />
              </motion.div>
              <motion.h1
                className='text-3xl font-black text-gray-900 dark:text-white mb-2'
                animate={
                  animations.glowEffects
                    ? {
                        textShadow: [
                          "0 0 0px rgba(34, 197, 94, 0)",
                          "0 0 20px rgba(34, 197, 94, 0.3)",
                          "0 0 0px rgba(34, 197, 94, 0)",
                        ],
                      }
                    : {}
                }
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                Join Memory Masters
              </motion.h1>
              <p className='text-gray-600 dark:text-gray-300'>
                Create your account to start playing
              </p>
            </motion.div>

            <motion.form
              onSubmit={handleSubmit}
              className='space-y-6'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Username field */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              >
                <label
                  htmlFor='username'
                  className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'
                >
                  Username
                </label>
                <div className='relative'>
                  <UserIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='text'
                    id='username'
                    name='username'
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className='w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-300'
                    placeholder='Choose a username'
                  />
                  {/* Username validation indicator */}
                  {formData.username && (
                    <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                      {usernameValidation.isValid ? (
                        <CheckCircleIcon className='w-5 h-5 text-green-500' />
                      ) : (
                        <XCircleIcon className='w-5 h-5 text-red-500' />
                      )}
                    </div>
                  )}
                </div>
                {/* Username validation message */}
                {formData.username && (
                  <p
                    className={`text-sm mt-1 ${
                      usernameValidation.isValid
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {usernameValidation.message}
                  </p>
                )}
              </motion.div>

              {/* Email field */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              >
                <label
                  htmlFor='email'
                  className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'
                >
                  Email
                </label>
                <div className='relative'>
                  <EnvelopeIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='email'
                    id='email'
                    name='email'
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className='w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-300'
                    placeholder='Enter your email'
                  />
                </div>
              </motion.div>

              {/* Password field */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
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
                    className='w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-300'
                    placeholder='Create a password'
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

              {/* Confirm Password field */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              >
                <label
                  htmlFor='confirmPassword'
                  className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'
                >
                  Confirm Password
                </label>
                <div className='relative'>
                  <LockClosedIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id='confirmPassword'
                    name='confirmPassword'
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className='w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-300'
                    placeholder='Confirm your password'
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className='w-5 h-5' />
                    ) : (
                      <EyeIcon className='w-5 h-5' />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Sign Up button */}
              <motion.button
                type='submit'
                disabled={loading || !usernameValidation.isValid}
                className='w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 text-white py-3 px-4 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-md relative overflow-hidden group'
                whileHover={animations.hoverEffects ? { scale: 1.02 } : {}}
                whileTap={animations.buttonAnimations ? { scale: 0.98 } : {}}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
              >
                {/* Animated background glow - only on desktop */}
                {animations.glowEffects && (
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
                )}

                <span className='relative z-10 flex items-center justify-center gap-2'>
                  {loading ? (
                    <>
                      {animations.buttonAnimations ? (
                        <motion.div
                          className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full'
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                      ) : (
                        <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      )}
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRightIcon className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                    </>
                  )}
                </span>
              </motion.button>
            </motion.form>

            {/* Sign in link */}
            <motion.div
              className='mt-8 text-center'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              <p className='text-gray-600 dark:text-gray-300'>
                Already have an account?{" "}
                <Link
                  to='/login'
                  className='text-green-600 hover:text-green-700 font-semibold hover:underline transition-colors'
                >
                  Sign in here
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
