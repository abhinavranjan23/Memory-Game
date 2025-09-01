import { useState, useEffect } from "react";

/**
 * Custom hook to detect mobile devices and optimize animations
 * Reduces heavy animations on mobile for better performance while keeping form animations smooth
 */
export const useMobileOptimization = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // Check if it's a mobile device
      const mobileRegex =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileDevice = mobileRegex.test(navigator.userAgent);

      // Check screen size
      const isSmallScreen = window.innerWidth <= 768;

      // Check for touch capability (mobile indicator)
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Check device memory (if available)
      const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;

      // Check connection speed (if available)
      const hasSlowConnection =
        navigator.connection &&
        (navigator.connection.effectiveType === "slow-2g" ||
          navigator.connection.effectiveType === "2g" ||
          navigator.connection.effectiveType === "3g");

      setIsMobile(isMobileDevice || isSmallScreen || hasTouch);
      setIsLowEndDevice(hasLowMemory || hasSlowConnection);
    };

    checkDevice();

    // Recheck on resize
    window.addEventListener("resize", checkDevice);

    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Get optimized animation settings
  const getOptimizedAnimations = () => {
    if (isLowEndDevice) {
      return {
        // Minimal animations for low-end devices
        floatingParticles: false,
        backgroundAnimations: false,
        complexTransitions: false,
        hoverEffects: false,
        glowEffects: false,
        formAnimations: true, // Keep form animations smooth
        buttonAnimations: false,
        loadingAnimations: true, // Keep loading animations
        // Performance optimizations
        reduceMotion: true,
        simplifyTransitions: true,
        optimizeRendering: true,
      };
    }

    if (isMobile) {
      return {
        // Reduced animations for mobile but keep forms smooth
        floatingParticles: false,
        backgroundAnimations: false,
        complexTransitions: false,
        hoverEffects: false,
        glowEffects: false,
        formAnimations: true, // Keep form animations smooth
        buttonAnimations: true, // Keep button animations
        loadingAnimations: true, // Keep loading animations
        // Performance optimizations
        reduceMotion: false,
        simplifyTransitions: true,
        optimizeRendering: true,
      };
    }

    // Full animations for desktop
    return {
      floatingParticles: true,
      backgroundAnimations: true,
      complexTransitions: true,
      hoverEffects: true,
      glowEffects: true,
      formAnimations: true,
      buttonAnimations: true,
      loadingAnimations: true,
      // Performance optimizations
      reduceMotion: false,
      simplifyTransitions: false,
      optimizeRendering: false,
    };
  };

  // Get optimized motion props for form elements
  const getFormMotionProps = (defaultProps, mobileProps = {}) => {
    if (isLowEndDevice) {
      return {
        ...defaultProps,
        ...mobileProps,
        // Optimize for low-end devices
        transition: {
          ...defaultProps.transition,
          duration: Math.min(
            (defaultProps.transition?.duration || 0.6) * 0.7,
            0.8
          ),
          ease: "easeOut",
        },
      };
    }

    if (isMobile) {
      return {
        ...defaultProps,
        ...mobileProps,
        // Slightly reduce duration on mobile but keep smooth
        transition: {
          ...defaultProps.transition,
          duration: Math.min(
            (defaultProps.transition?.duration || 0.6) * 0.8,
            1.0
          ),
          ease: "easeOut",
        },
      };
    }

    return defaultProps;
  };

  // Get optimized motion props for background/decoration elements
  const getBackgroundMotionProps = (defaultProps, mobileProps = {}) => {
    if (isMobile || isLowEndDevice) {
      return {
        ...defaultProps,
        ...mobileProps,
        // Significantly reduce background animations on mobile
        transition: {
          ...defaultProps.transition,
          duration: (defaultProps.transition?.duration || 1) * 0.3,
          ease: "easeOut",
        },
      };
    }

    return defaultProps;
  };

  // Check if we should reduce motion for accessibility
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Disable motion entirely for very low-end devices or accessibility preference
  const shouldDisableMotion = isLowEndDevice || prefersReducedMotion;

  // Check if we should optimize rendering
  const shouldOptimizeRendering = isMobile || isLowEndDevice;

  return {
    isMobile,
    isLowEndDevice,
    prefersReducedMotion,
    getOptimizedAnimations,
    getFormMotionProps,
    getBackgroundMotionProps,
    shouldDisableMotion,
    shouldOptimizeRendering,
  };
};
