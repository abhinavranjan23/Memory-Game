import { useState, useEffect } from "react";

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
        formAnimations: true,
        buttonAnimations: false,
        loadingAnimations: true,
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
        buttonAnimations: true,
        loadingAnimations: true,
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

        transition: {
          ...defaultProps.transition,
          duration: (defaultProps.transition?.duration || 1) * 0.3,
          ease: "easeOut",
        },
      };
    }

    return defaultProps;
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const shouldDisableMotion = isLowEndDevice || prefersReducedMotion;

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
