import React from "react";

const ProfileShimmer = () => {
  return (
    <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6'>
      {/* Profile Header */}
      <div className='bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl'>
        <div className='flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6'>
          {/* Avatar */}
          <div className='relative'>
            <div className='w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-sm animate-pulse'></div>
            {/* Admin badge shimmer */}
            <div className='absolute -top-1 -right-1 w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse'></div>
          </div>

          {/* User info */}
          <div className='flex-1'>
            <div className='flex items-center gap-2 sm:gap-3 mb-3'>
              {/* Username */}
              <div className='h-8 sm:h-10 bg-white/20 rounded-lg animate-pulse w-32 sm:w-40'></div>
              {/* Edit button */}
              <div className='w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl animate-pulse'></div>
            </div>

            {/* User type */}
            <div className='h-4 sm:h-5 bg-white/20 rounded animate-pulse w-32 sm:w-40 mb-4 sm:mb-5'></div>

            {/* Stats badges */}
            <div className='flex flex-wrap gap-3 sm:gap-4'>
              <div className='flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full'>
                <div className='w-3 h-3 sm:w-4 sm:h-4 bg-white/20 rounded animate-pulse'></div>
                <div className='h-3 sm:h-4 bg-white/20 rounded animate-pulse w-16 sm:w-20'></div>
              </div>
              <div className='flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full'>
                <div className='w-3 h-3 sm:w-4 sm:h-4 bg-white/20 rounded animate-pulse'></div>
                <div className='h-3 sm:h-4 bg-white/20 rounded animate-pulse w-12 sm:w-16'></div>
              </div>
              <div className='flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full'>
                <div className='w-3 h-3 sm:w-4 sm:h-4 bg-white/20 rounded animate-pulse'></div>
                <div className='h-3 sm:h-4 bg-white/20 rounded animate-pulse w-20 sm:w-24'></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700'>
        <div className='border-b border-gray-200 dark:border-gray-700'>
          <nav className='flex overflow-x-auto scrollbar-hide'>
            {/* Tab shimmer */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className='flex items-center px-4 sm:px-6 py-4 text-xs sm:text-sm font-bold whitespace-nowrap tracking-wide'
              >
                <div className='w-4 h-4 mr-2 sm:mr-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
                <div className='h-4 sm:h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16 sm:w-20'></div>
              </div>
            ))}
          </nav>
        </div>

        <div className='p-4 sm:p-6'>
          {/* Overview Tab Content */}
          <div className='space-y-6'>
            {/* Stats Cards Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className='bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700'
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex-1'>
                      {/* Title */}
                      <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 sm:w-24 mb-2'></div>
                      {/* Value */}
                      <div className='h-8 sm:h-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16 sm:w-20 mb-2'></div>
                      {/* Subtitle */}
                      <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-24 sm:w-28'></div>
                    </div>
                    {/* Icon */}
                    <div className='w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-2xl animate-pulse'></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Achievements */}
            <div>
              {/* Section title */}
              <div className='h-6 sm:h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-48 sm:w-56 mb-6'></div>
              
              {/* Achievements grid */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className='p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                  >
                    <div className='flex items-center space-x-3'>
                      {/* Achievement icon */}
                      <div className='w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
                      <div className='flex-1'>
                        {/* Achievement name */}
                        <div className='h-4 sm:h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-32 sm:w-40 mb-2'></div>
                        {/* Achievement description */}
                        <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-48 sm:w-56 mb-1'></div>
                        {/* Unlock date */}
                        <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-24 sm:w-32'></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileShimmer;
