import React from "react";
import { motion } from "framer-motion";

/**
 * Smooth Form Animations Component
 * Provides optimized animations that work smoothly on all devices
 */
export const SmoothFormAnimations = {
  // Container animation - smooth entrance
  Container: ({ children, delay = 0, ...props }) => (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for smooth feel
      }}
      {...props}
    >
      {children}
    </motion.div>
  ),

  // Form field animation - smooth slide in
  Field: ({ children, delay = 0, direction = "left", ...props }) => (
    <motion.div
      initial={{
        opacity: 0,
        x: direction === "left" ? -30 : direction === "right" ? 30 : 0,
        y: direction === "up" ? 20 : direction === "down" ? -20 : 0,
      }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      {...props}
    >
      {children}
    </motion.div>
  ),

  // Button animation - smooth scale and fade
  Button: ({ children, delay = 0, ...props }) => (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
        scale: {
          type: "spring",
          stiffness: 400,
          damping: 25,
        },
      }}
      {...props}
    >
      {children}
    </motion.button>
  ),

  // Header animation - smooth fade down
  Header: ({ children, delay = 0, ...props }) => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      {...props}
    >
      {children}
    </motion.div>
  ),

  // Icon animation - smooth scale and rotate
  Icon: ({ children, delay = 0, ...props }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.1, rotate: 5 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
        scale: {
          type: "spring",
          stiffness: 300,
          damping: 20,
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  ),

  // Staggered children animation
  StaggerContainer: ({ children, staggerDelay = 0.1, ...props }) => (
    <motion.div
      initial='hidden'
      animate='visible'
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.2,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  ),

  // Staggered item
  StaggerItem: ({ children, ...props }) => (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  ),
};

/**
 * CSS-based smooth animations for better performance
 * Use these classes for simple animations that work on all devices
 */
export const smoothAnimationsCSS = {
  // Add these classes to your CSS file
  classes: `
    .smooth-fade-in {
      animation: smoothFadeIn 0.8s ease-out forwards;
    }
    
    .smooth-slide-up {
      animation: smoothSlideUp 0.6s ease-out forwards;
    }
    
    .smooth-slide-left {
      animation: smoothSlideLeft 0.6s ease-out forwards;
    }
    
    .smooth-scale-in {
      animation: smoothScaleIn 0.5s ease-out forwards;
    }
    
    @keyframes smoothFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes smoothSlideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes smoothSlideLeft {
      from {
        opacity: 0;
        transform: translateX(-30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes smoothScaleIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
};

export default SmoothFormAnimations;
