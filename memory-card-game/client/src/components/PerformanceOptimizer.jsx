import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// Lazy Image Component with Intersection Observer
export const LazyImage = ({
  src,
  alt,
  className,
  placeholder = null,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {/* Placeholder */}
      {!isLoaded && placeholder && (
        <div className='absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded' />
      )}

      {/* Actual Image */}
      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className={`w-full h-full object-cover ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          {...props}
        />
      )}
    </div>
  );
};

// Performance Monitor Component
export const PerformanceMonitor = ({ children, threshold = 100 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: threshold / 100 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  if (!isVisible) {
    return (
      <div
        ref={ref}
        className='min-h-[200px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded'
      />
    );
  }

  return children;
};

// Debounced Input Component
export const DebouncedInput = ({ value, onChange, delay = 300, ...props }) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(localValue);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [localValue, onChange, delay]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      {...props}
    />
  );
};

// Virtual List Component for large lists
export const VirtualList = ({
  items,
  itemHeight,
  renderItem,
  containerHeight = 400,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const visibleItems = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleItems + 1, items.length);

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: "auto" }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {items
            .slice(startIndex, endIndex)
            .map((item, index) => renderItem(item, startIndex + index))}
        </div>
      </div>
    </div>
  );
};

// Memoized Component Wrapper
export const MemoizedComponent = React.memo(({ children, ...props }) => {
  return <div {...props}>{children}</div>;
});

// Performance HOC
export const withPerformanceOptimization = (WrappedComponent, options = {}) => {
  const { memo = true, lazy = false } = options;

  let Component = WrappedComponent;

  if (memo) {
    Component = React.memo(Component);
  }

  if (lazy) {
    Component = React.lazy(() => Promise.resolve({ default: Component }));
  }

  return Component;
};

export default {
  LazyImage,
  PerformanceMonitor,
  DebouncedInput,
  VirtualList,
  MemoizedComponent,
  withPerformanceOptimization,
};
