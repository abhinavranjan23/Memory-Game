import React from "react";

const HomeShimmer = () => {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Hero Section Shimmer */}
      <div className='bg-gradient-to-br from-blue-600 to-purple-700 relative overflow-hidden'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24'>
          <div className='text-center'>
            {/* Title Shimmer */}
            <div className='h-8 sm:h-10 lg:h-12 bg-white/20 rounded-lg mb-4 sm:mb-6 animate-pulse max-w-xs sm:max-w-lg lg:max-w-2xl mx-auto'></div>
            <div className='h-6 sm:h-7 lg:h-8 bg-white/20 rounded-lg mb-6 sm:mb-8 animate-pulse max-w-sm sm:max-w-md lg:max-w-xl mx-auto'></div>

            {/* Description Shimmer */}
            <div className='space-y-2 sm:space-y-3 mb-6 sm:mb-8'>
              <div className='h-3 sm:h-4 bg-white/20 rounded animate-pulse max-w-xs sm:max-w-2xl lg:max-w-3xl mx-auto'></div>
              <div className='h-3 sm:h-4 bg-white/20 rounded animate-pulse max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto'></div>
              <div className='h-3 sm:h-4 bg-white/20 rounded animate-pulse max-w-xs sm:max-w-lg lg:max-w-xl mx-auto'></div>
            </div>

            {/* CTA Buttons Shimmer */}
            <div className='flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center'>
              <div className='h-10 sm:h-12 bg-white/20 rounded-lg animate-pulse w-full sm:w-40 lg:w-48'></div>
              <div className='h-10 sm:h-12 bg-white/20 rounded-lg animate-pulse w-full sm:w-40 lg:w-48'></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section Shimmer */}
      <div className='py-8 sm:py-12 lg:py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          {/* Section Title */}
          <div className='text-center mb-8 sm:mb-12'>
            <div className='h-6 sm:h-8 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse max-w-sm sm:max-w-md mx-auto mb-3 sm:mb-4'></div>
            <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse max-w-xs sm:max-w-xl lg:max-w-2xl mx-auto'></div>
          </div>

          {/* Features Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8'>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className='bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg'
              >
                {/* Icon Shimmer */}
                <div className='h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse mb-3 sm:mb-4'></div>

                {/* Title Shimmer */}
                <div className='h-4 sm:h-5 lg:h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-2 sm:mb-3'></div>

                {/* Description Shimmer */}
                <div className='space-y-2'>
                  <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
                  <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-3/4'></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section Shimmer */}
      <div className='bg-gray-100 dark:bg-gray-800 py-8 sm:py-12 lg:py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8'>
            {[1, 2, 3].map((item) => (
              <div key={item} className='text-center'>
                <div className='h-6 sm:h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-2'></div>
                <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-2/3 mx-auto'></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section Shimmer */}
      <div className='py-8 sm:py-12 lg:py-16'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <div className='h-6 sm:h-8 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto mb-3 sm:mb-4'></div>
          <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse max-w-xs sm:max-w-lg lg:max-w-xl mx-auto mb-6 sm:mb-8'></div>
          <div className='h-10 sm:h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse w-full sm:w-40 lg:w-48 mx-auto'></div>
        </div>
      </div>
    </div>
  );
};

export default HomeShimmer;
