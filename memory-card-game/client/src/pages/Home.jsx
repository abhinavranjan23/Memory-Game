import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { useMobileOptimization } from "../hooks/useMobileOptimization.js";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import {
  PlayIcon,
  TrophyIcon,
  UsersIcon,
  SparklesIcon,
  RocketLaunchIcon,
  BoltIcon,
  StarIcon,
  FireIcon,
  EyeIcon,
  ArrowRightIcon,
  PuzzlePieceIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, TextPlugin);

const Home = () => {
  const { user } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Get mobile optimization settings
  const { isMobile, isLowEndDevice, getOptimizedAnimations } =
    useMobileOptimization();
  const animations = getOptimizedAnimations();

  // Refs for sections
  const heroRef = useRef(null);
  const ctaRef = useRef(null);

  // Throttle function for performance
  const throttle = useCallback((func, limit) => {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }, []);

  // Mouse tracking and scroll tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    const throttledScroll = throttle(handleScroll, 16);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", throttledScroll, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", throttledScroll);
    };
  }, [throttle]);

  // GSAP Animations - Simplified and optimized
  useEffect(() => {
    // Hero section animations
    const heroTl = gsap.timeline();
    heroTl
      .fromTo(
        heroRef.current,
        { opacity: 0, y: 100 },
        { opacity: 1, y: 0, duration: 1.5, ease: "power3.out" }
      )
      .fromTo(
        ".hero-title",
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: "power2.out" },
        "-=1.2"
      )
      .fromTo(
        ".hero-subtitle",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: "power2.out" },
        "-=0.8"
      )
      .fromTo(
        ".hero-cta",
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" },
        "-=0.7"
      );

    // CTA animation
    gsap.fromTo(
      ctaRef.current,
      { opacity: 0, scale: 0.9 },
      {
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: "power2.out",
        delay: 2,
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const FeatureCard = ({
    icon: Icon,
    title,
    description,
    color,
    delay,
    index,
  }) => {
    return (
      <motion.div
        className='feature-card bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/50 cursor-pointer relative overflow-hidden'
        style={{
          transformStyle: "preserve-3d",
          perspective: "1000px",
        }}
        data-color={color}
        whileHover={{
          scale: 1.05,
          y: -8,
          transition: { duration: 0.3, ease: "easeOut" },
        }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Enhanced background gradient */}
        <motion.div
          className='bg-gradient absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent'
          style={{
            background: `linear-gradient(135deg, transparent, ${color}15, transparent)`,
            transition: "all 0.3s ease-out",
            opacity: 0,
          }}
        />

        <div className='text-center relative z-10'>
          {/* Enhanced icon container */}
          <motion.div
            className='icon-container w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg'
            style={{
              background: `linear-gradient(135deg, ${color}20, ${color}40)`,
              transform: "translateZ(20px)",
              transition: "all 0.3s ease-out",
            }}
          >
            <Icon className='h-10 w-10' style={{ color }} />
          </motion.div>

          <h3 className='text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tight'>
            {title}
          </h3>
          <p className='text-gray-600 dark:text-gray-300 leading-relaxed'>
            {description}
          </p>
        </div>
      </motion.div>
    );
  };

  const GameModeCard = ({ icon, title, description, gradient, delay }) => {
    return (
      <motion.div
        className='game-mode-card bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/30 dark:border-gray-700/50 cursor-pointer relative overflow-hidden'
        style={{
          transformStyle: "preserve-3d",
          perspective: "1000px",
        }}
        whileHover={{
          scale: 1.05,
          y: -8,
          transition: { duration: 0.3, ease: "easeOut" },
        }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Enhanced background gradient */}
        <motion.div
          className='bg-gradient absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent'
          style={{
            background: `linear-gradient(135deg, transparent, #8B5CF615, transparent)`,
            transition: "all 0.3s ease-out",
            opacity: 0,
          }}
        />

        <div className='text-center relative z-10'>
          <div
            className='emoji-icon text-5xl mb-4'
            style={{
              transform: "translateZ(30px)",
              display: "inline-block",
              transition: "all 0.3s ease-out",
            }}
          >
            {icon}
          </div>

          <h3 className='text-xl font-black text-gray-900 dark:text-white mb-3 tracking-tight'>
            {title}
          </h3>
          <p className='text-gray-600 dark:text-gray-300 text-sm leading-relaxed'>
            {description}
          </p>
        </div>
      </motion.div>
    );
  };

  const PowerUpItem = ({ icon, title, description, delay }) => {
    return (
      <motion.div
        className='power-up-item bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/50 cursor-pointer relative overflow-hidden'
        style={{
          transformStyle: "preserve-3d",
          perspective: "1000px",
        }}
        whileHover={{
          scale: 1.05,
          y: -8,
          transition: { duration: 0.3, ease: "easeOut" },
        }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Enhanced background gradient */}
        <motion.div
          className='bg-gradient absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent'
          style={{
            background: `linear-gradient(135deg, transparent, #10B98115, transparent)`,
            transition: "all 0.3s ease-out",
            opacity: 0,
          }}
        />

        <div className='text-center relative z-10'>
          <div
            className='emoji-icon text-4xl mb-3'
            style={{
              display: "inline-block",
              transition: "all 0.3s ease-out",
            }}
          >
            {icon}
          </div>

          <h4 className='font-black text-gray-900 dark:text-white mb-2 tracking-tight'>
            {title}
          </h4>
          <p className='text-sm text-gray-600 dark:text-gray-300'>
            {description}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <style>
        {`
          .feature-card:hover .icon-container {
            transform: translateZ(20px) rotate(15deg) scale(1.1) !important;
          }
          .feature-card:hover .bg-gradient {
            opacity: 1 !important;
          }
          /* Specific colors for feature cards */
          .feature-card[data-color="#3B82F6"]:hover .icon-container {
            background: linear-gradient(135deg, #3B82F640, #3B82F660) !important;
          }
          .feature-card[data-color="#3B82F6"]:hover .bg-gradient {
            background: linear-gradient(135deg, transparent, #3B82F635, transparent) !important;
          }
          .feature-card[data-color="#10B981"]:hover .icon-container {
            background: linear-gradient(135deg, #10B98140, #10B98160) !important;
          }
          .feature-card[data-color="#10B981"]:hover .bg-gradient {
            background: linear-gradient(135deg, transparent, #10B98135, transparent) !important;
          }
          .feature-card[data-color="#8B5CF6"]:hover .icon-container {
            background: linear-gradient(135deg, #8B5CF640, #8B5CF660) !important;
          }
          .feature-card[data-color="#8B5CF6"]:hover .bg-gradient {
            background: linear-gradient(135deg, transparent, #8B5CF635, transparent) !important;
          }
          .game-mode-card:hover .emoji-icon {
            transform: translateZ(30px) rotate(15deg) scale(1.1) !important;
            filter: brightness(1.2) !important;
          }
          .game-mode-card:hover .bg-gradient {
            opacity: 1 !important;
            background: linear-gradient(135deg, transparent, #8B5CF635, transparent) !important;
          }
          .power-up-item:hover .emoji-icon {
            transform: rotate(12deg) scale(1.1) !important;
            filter: brightness(1.2) !important;
          }
          .power-up-item:hover .bg-gradient {
            opacity: 1 !important;
            background: linear-gradient(135deg, transparent, #10B98135, transparent) !important;
          }
        `}
      </style>
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden'>
        {/* Static Background Elements - No animations to prevent scrolling issues */}
        <div className='fixed inset-0 pointer-events-none overflow-hidden z-0'>
          {/* Static decorative elements */}
          <div className='absolute top-10 left-5 w-52 h-52 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl'></div>
          <div className='absolute top-60 right-5 w-40 h-40 bg-gradient-to-br from-green-400/8 to-blue-400/8 rounded-full blur-2xl'></div>
          <div className='absolute bottom-60 left-1/4 w-60 h-60 bg-gradient-to-br from-purple-400/8 to-pink-400/8 rounded-full blur-3xl'></div>
          <div className='absolute top-1/2 left-1/3 w-36 h-36 bg-gradient-to-br from-yellow-400/8 to-orange-400/8 rounded-full blur-xl'></div>
          <div className='absolute bottom-1/3 right-1/3 w-48 h-48 bg-gradient-to-br from-cyan-400/8 to-blue-400/8 rounded-full blur-2xl'></div>
          <div className='absolute top-1/3 right-1/4 w-44 h-44 bg-gradient-to-br from-pink-400/8 to-red-400/8 rounded-full blur-2xl'></div>
        </div>

        <div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          {/* Hero Section */}
          <div
            ref={heroRef}
            className='text-center py-24 lg:py-32'
            style={{
              transform: `perspective(1000px) rotateX(${
                mousePosition.y * 3
              }deg) rotateY(${mousePosition.x * 3}deg)`,
              willChange: "transform",
            }}
          >
            <motion.h1
              className='hero-title text-6xl lg:text-8xl font-black mb-8 tracking-tight cursor-pointer'
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textRendering: "optimizeLegibility",
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
                transform: `perspective(1000px) rotateX(${
                  mousePosition.y * 2.5
                }deg) rotateY(${mousePosition.x * 2.5}deg)`,
                lineHeight: "1.1",
                paddingBottom: "0.1em",
                color: "#667eea",
                willChange: "transform",
              }}
              whileHover={{
                scale: 1.05,
                textShadow: "0 0 30px rgba(102, 126, 234, 0.5)",
              }}
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                y: {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              Memory Masters
            </motion.h1>

            <motion.p
              className='hero-subtitle text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed'
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
            >
              Challenge your memory in exciting multiplayer card games! Play
              with friends, unlock achievements, and climb the leaderboards in
              this next-generation memory game.
            </motion.p>

            <motion.div
              className='hero-cta flex flex-col sm:flex-row gap-6 justify-center'
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              {user ? (
                <>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to='/lobby'
                      className='group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-2xl text-xl font-black transition-all duration-300 shadow-2xl hover:shadow-3xl flex items-center justify-center gap-3'
                    >
                      <PlayIcon className='h-6 w-6 group-hover:scale-110 transition-transform' />
                      Play Now
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to='/dashboard'
                      className='group bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg hover:bg-white dark:hover:bg-gray-800 text-gray-900 dark:text-white px-10 py-4 rounded-2xl text-xl font-black transition-all duration-300 shadow-xl hover:shadow-2xl border border-white/20 dark:border-gray-700/50 flex items-center justify-center gap-3'
                    >
                      <TrophyIcon className='h-6 w-6 group-hover:scale-110 transition-transform' />
                      Dashboard
                    </Link>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className='relative'
                  >
                    <Link
                      to='/register'
                      className='group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-2xl text-xl font-black transition-all duration-300 shadow-2xl hover:shadow-3xl flex items-center justify-center gap-3 relative overflow-hidden'
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

                      {/* Floating sparkles */}
                      <motion.div
                        className='absolute inset-0'
                        animate={{
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 15,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <SparklesIcon className='absolute top-1 left-1 h-3 w-3 text-white/40' />
                        <SparklesIcon className='absolute bottom-1 right-1 h-2 w-2 text-white/30' />
                      </motion.div>

                      {/* Pulsing glow effect */}
                      <motion.div
                        className='absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-indigo-400/20 rounded-2xl'
                        animate={{
                          scale: [1, 1.05, 1],
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />

                      <motion.div
                        className='flex items-center justify-center gap-3 relative z-10'
                        whileHover={{ gap: 4 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Animated rocket icon */}
                        <motion.div
                          animate={{
                            rotate: [0, 5, -5, 0],
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <RocketLaunchIcon className='h-6 w-6 group-hover:scale-110 transition-transform' />
                        </motion.div>

                        <span className='relative'>
                          Get Started
                          <motion.div
                            className='absolute -bottom-1 left-0 right-0 h-0.5 bg-white/50'
                            initial={{ scaleX: 0 }}
                            whileHover={{ scaleX: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        </span>
                      </motion.div>
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className='relative'
                  >
                    <Link
                      to='/login'
                      className='group bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg hover:bg-white dark:hover:bg-gray-800 text-gray-900 dark:text-white px-10 py-4 rounded-2xl text-xl font-black transition-all duration-300 shadow-xl hover:shadow-2xl border border-white/20 dark:border-gray-700/50 flex items-center justify-center gap-3 relative overflow-hidden'
                    >
                      {/* Subtle animated glow */}
                      <motion.div
                        className='absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-indigo-400/10 rounded-2xl'
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />

                      {/* Floating dots */}
                      <motion.div
                        className='absolute inset-0'
                        animate={{
                          rotate: [0, 180, 360],
                        }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <div className='absolute top-2 left-2 w-1 h-1 bg-blue-400/40 rounded-full' />
                        <div className='absolute bottom-2 right-2 w-1 h-1 bg-purple-400/40 rounded-full' />
                        <div className='absolute top-1/2 left-1/4 w-0.5 h-0.5 bg-indigo-400/30 rounded-full' />
                        <div className='absolute bottom-1/2 right-1/4 w-0.5 h-0.5 bg-green-400/30 rounded-full' />
                      </motion.div>

                      <motion.div
                        className='flex items-center justify-center gap-3 relative z-10'
                        whileHover={{ gap: 4 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Animated users icon */}
                        <motion.div
                          animate={{
                            y: [0, -2, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <UsersIcon className='h-6 w-6 group-hover:scale-110 transition-transform' />
                        </motion.div>

                        <span className='relative'>
                          Login
                          <motion.div
                            className='absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400/50 to-purple-400/50'
                            initial={{ scaleX: 0 }}
                            whileHover={{ scaleX: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        </span>
                      </motion.div>
                    </Link>
                  </motion.div>
                </>
              )}
            </motion.div>
          </div>

          {/* Floating Bubbles Section */}
          <div className='relative py-16 overflow-hidden'>
            <motion.div
              className='absolute inset-0 pointer-events-none'
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
              <motion.div
                className='absolute top-1/2 left-1/4 w-1.5 h-1.5 bg-green-400/30 rounded-full'
                animate={{
                  y: [0, -30, 0],
                  x: [0, 15, 0],
                }}
                transition={{
                  duration: 3.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className='absolute top-1/3 right-1/3 w-1 h-1 bg-pink-400/35 rounded-full'
                animate={{
                  y: [0, -22, 0],
                  x: [0, -12, 0],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className='absolute bottom-1/3 left-1/2 w-1.5 h-1.5 bg-yellow-400/25 rounded-full'
                animate={{
                  y: [0, -28, 0],
                  x: [0, 8, 0],
                }}
                transition={{
                  duration: 4.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className='absolute top-2/3 right-1/4 w-1 h-1 bg-cyan-400/30 rounded-full'
                animate={{
                  y: [0, -16, 0],
                  x: [0, -10, 0],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </div>

          {/* Features Section */}
          <div className='py-24'>
            <h2 className='text-4xl lg:text-5xl font-black text-center text-gray-900 dark:text-white mb-16 tracking-tight'>
              Why Choose Memory Masters?
            </h2>

            <div className='grid md:grid-cols-3 gap-8'>
              <FeatureCard
                icon={AcademicCapIcon}
                title='Memory Training'
                description='Improve your memory skills with engaging card matching games across multiple difficulty levels and brain-training exercises.'
                color='#3B82F6'
                delay={0.1}
                index={0}
              />
              <FeatureCard
                icon={UsersIcon}
                title='Multiplayer Fun'
                description='Play with friends in real-time multiplayer matches or join public rooms to meet new players from around the world.'
                color='#10B981'
                delay={0.2}
                index={1}
              />
              <FeatureCard
                icon={TrophyIcon}
                title='Achievements'
                description='Unlock achievements, track your progress, and compete on global leaderboards to prove your memory mastery.'
                color='#8B5CF6'
                delay={0.3}
                index={2}
              />
            </div>
          </div>

          {/* Game Modes Section */}
          <div className='py-24'>
            <h2 className='text-4xl lg:text-5xl font-black text-center text-gray-900 dark:text-white mb-16 tracking-tight'>
              Game Modes
            </h2>

            <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8'>
              <GameModeCard
                icon='🎯'
                title='Classic Mode'
                description='Traditional memory game with turn-based gameplay and strategic thinking.'
                delay={0.1}
              />
              <GameModeCard
                icon='⚡'
                title='Blitz Mode'
                description='Fast-paced 60-second memory challenges that test your speed and accuracy.'
                delay={0.2}
              />
              <GameModeCard
                icon='💥'
                title='Sudden Death'
                description='Tie-breaker rounds with single-pair elimination for ultimate excitement.'
                delay={0.3}
              />
              <GameModeCard
                icon='🎮'
                title='Power-Up Frenzy'
                description='Use special abilities like peek, swap, and freeze to gain the upper hand.'
                delay={0.4}
              />
            </div>
          </div>

          {/* Power-ups Section */}
          <div className='py-24 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-3xl'>
            <h2 className='text-4xl lg:text-5xl font-black text-center text-gray-900 dark:text-white mb-16 tracking-tight'>
              Power-Ups & Abilities
            </h2>

            <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-8'>
              <PowerUpItem
                icon='🔄'
                title='Extra Turn'
                description='Get another turn even if you miss a match'
                delay={0.1}
              />
              <PowerUpItem
                icon='👁️'
                title='Peek'
                description='Briefly see all unmatched cards'
                delay={0.2}
              />
              <PowerUpItem
                icon='🔀'
                title='Card Swap'
                description='Swap positions of two cards'
                delay={0.3}
              />
              <PowerUpItem
                icon='💡'
                title='Reveal One'
                description='Permanently reveal one card'
                delay={0.4}
              />
              <PowerUpItem
                icon='❄️'
                title='Time Freeze'
                description='Freeze the timer for 10 seconds'
                delay={0.5}
              />
              <PowerUpItem
                icon='🌀'
                title='Shuffle Cards'
                description='Shuffle all unmatched cards'
                delay={0.6}
              />
            </div>
          </div>

          {/* Interactive Scroll Indicator */}
          <motion.div
            className='fixed bottom-8 right-8 z-50'
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: scrollY > 100 ? 1 : 0,
              scale: scrollY > 100 ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className='w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all duration-300'
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ↑
              </motion.div>
            </motion.button>
          </motion.div>

          {/* CTA Section */}
          <div ref={ctaRef} className='text-center py-24 relative mt-16'>
            {/* Animated border for CTA section */}
            <motion.div
              className='absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-br from-blue-50/80 via-indigo-50/70 to-purple-50/80 dark:from-blue-900/40 dark:via-indigo-900/30 dark:to-purple-900/40 backdrop-blur-sm'
              animate={{
                background: [
                  "linear-gradient(135deg, rgba(239, 246, 255, 0.8), rgba(238, 242, 255, 0.7), rgba(243, 232, 255, 0.8))",
                  "linear-gradient(135deg, rgba(238, 242, 255, 0.7), rgba(243, 232, 255, 0.8), rgba(239, 246, 255, 0.8))",
                  "linear-gradient(135deg, rgba(243, 232, 255, 0.8), rgba(239, 246, 255, 0.8), rgba(238, 242, 255, 0.7))",
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
                  "linear-gradient(45deg, rgba(59, 130, 246, 0.6), rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.6), rgba(59, 130, 246, 0.6))",
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

            {/* Animated background */}
            <motion.div
              className='absolute inset-0 bg-gradient-to-r from-blue-100/20 via-indigo-100/20 to-purple-100/20 dark:from-blue-800/20 dark:via-indigo-800/20 dark:to-purple-800/20 rounded-3xl'
              animate={{
                background: [
                  "linear-gradient(135deg, rgba(219, 234, 254, 0.2), rgba(224, 231, 255, 0.2), rgba(237, 233, 254, 0.2))",
                  "linear-gradient(135deg, rgba(224, 231, 255, 0.2), rgba(237, 233, 254, 0.2), rgba(219, 234, 254, 0.2))",
                  "linear-gradient(135deg, rgba(237, 233, 254, 0.2), rgba(219, 234, 254, 0.2), rgba(224, 231, 255, 0.2))",
                ],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            {/* Floating particles for visual appeal - only on desktop */}
            {animations.floatingParticles && (
              <motion.div
                className='absolute inset-0 overflow-hidden pointer-events-none'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
              >
                <motion.div
                  className='absolute top-20 left-20 w-2 h-2 bg-blue-400/40 rounded-full'
                  animate={{
                    y: [0, -30, 0],
                    x: [0, 15, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className='absolute top-40 right-32 w-1.5 h-1.5 bg-indigo-400/50 rounded-full'
                  animate={{
                    y: [0, -25, 0],
                    x: [0, -12, 0],
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className='absolute bottom-32 left-32 w-1 h-1 bg-purple-400/60 rounded-full'
                  animate={{
                    y: [0, -35, 0],
                    x: [0, 18, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className='absolute bottom-20 right-20 w-1.5 h-1.5 bg-blue-400/45 rounded-full'
                  animate={{
                    y: [0, -28, 0],
                    x: [0, -10, 0],
                  }}
                  transition={{
                    duration: 4.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
            )}

            <div className='relative z-10 px-8'>
              <motion.h2
                className='text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-8 tracking-tight relative z-10'
                whileHover={{ scale: 1.02 }}
                animate={{
                  textShadow: [
                    "0 0 0px rgba(59, 130, 246, 0)",
                    "0 0 25px rgba(59, 130, 246, 0.4)",
                    "0 0 0px rgba(59, 130, 246, 0)",
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                Ready to Test Your Memory?
              </motion.h2>
              <motion.p className='text-xl lg:text-2xl text-gray-700 dark:text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed relative z-10'>
                Join thousands of players and start your memory training journey
                today!
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className='relative z-10'
              >
                <motion.div
                  whileHover={{
                    scale: 1.05,
                    y: -8,
                    transition: { duration: 0.3, ease: "easeOut" },
                  }}
                  whileTap={{ scale: 0.95 }}
                  className='inline-block'
                >
                  <Link
                    to={user ? "/lobby" : "/register"}
                    className='group bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white px-12 py-5 rounded-2xl text-2xl font-black transition-all duration-300 shadow-2xl hover:shadow-3xl flex items-center justify-center gap-4 mx-auto w-fit relative overflow-hidden'
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

                    {/* Floating sparkles */}
                    <motion.div
                      className='absolute inset-0'
                      animate={{
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <SparklesIcon className='absolute top-2 left-2 h-4 w-4 text-white/30' />
                      <SparklesIcon className='absolute bottom-2 right-2 h-3 w-3 text-white/20' />
                      <SparklesIcon className='absolute top-1/2 left-1/4 h-2 w-2 text-white/25' />
                      <SparklesIcon className='absolute top-1/3 right-1/4 h-3 w-3 text-white/15' />
                    </motion.div>

                    {/* Pulsing glow effect */}
                    <motion.div
                      className='absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-indigo-400/20 rounded-2xl'
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    <motion.div
                      className='flex items-center justify-center gap-4 relative z-10'
                      whileHover={{ gap: 6 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Animated sparkle icon */}
                      <motion.div
                        animate={{
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <SparklesIcon className='h-8 w-8 group-hover:scale-110 transition-transform' />
                      </motion.div>

                      <span className='relative'>
                        {user ? "Play Now" : "Start Playing Now"}
                        <motion.div
                          className='absolute -bottom-1 left-0 right-0 h-0.5 bg-white/50'
                          initial={{ scaleX: 0 }}
                          whileHover={{ scaleX: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      </span>

                      {/* Animated arrow */}
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        whileHover={{ x: 8 }}
                      >
                        <ArrowRightIcon className='h-8 w-8 group-hover:scale-110 transition-transform' />
                      </motion.div>
                    </motion.div>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
