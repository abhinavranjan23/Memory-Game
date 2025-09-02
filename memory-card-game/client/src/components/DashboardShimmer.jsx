import React from "react";

const DashboardShimmer = () => {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8'>
        {/* Header Shimmer */}
        <div className='mb-6 sm:mb-8'>
          <div className='h-6 sm:h-8 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse max-w-48 sm:max-w-64 mb-2'></div>
          <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse max-w-sm sm:max-w-2xl'></div>
        </div>

        {/* Stats Cards Shimmer */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8'>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className='bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg'
            >
              <div className='flex items-center justify-between mb-3 sm:mb-4'>
                <div className='h-5 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 sm:w-24'></div>
                <div className='h-6 w-6 sm:h-8 sm:w-8 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'></div>
              </div>
              <div className='h-6 sm:h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-2'></div>
              <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-2/3'></div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8'>
          {/* Left Column - Charts */}
          <div className='lg:col-span-2 space-y-6 sm:space-y-8'>
            {/* Performance Chart */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6'>
              <div className='h-5 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-36 sm:w-48 mb-3 sm:mb-4'></div>
              <div className='h-48 sm:h-64 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
            </div>

            {/* Recent Games */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6'>
              <div className='h-5 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-24 sm:w-32 mb-3 sm:mb-4'></div>
              <div className='space-y-3 sm:space-y-4'>
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className='flex items-center space-x-3 sm:space-x-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg'
                  >
                    <div className='h-8 w-8 sm:h-10 sm:w-10 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse'></div>
                    <div className='flex-1 space-y-2'>
                      <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-3/4'></div>
                      <div className='h-2 sm:h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-1/2'></div>
                    </div>
                    <div className='h-5 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12 sm:w-16'></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - User Info & Actions */}
          <div className='space-y-6 sm:space-y-8'>
            {/* User Profile Card */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6'>
              <div className='text-center mb-4 sm:mb-6'>
                <div className='h-16 w-16 sm:h-20 sm:w-20 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse mx-auto mb-3 sm:mb-4'></div>
                <div className='h-5 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-24 sm:w-32 mx-auto mb-2'></div>
                <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 sm:w-24 mx-auto'></div>
              </div>

              <div className='space-y-3 sm:space-y-4'>
                <div className='flex justify-between items-center'>
                  <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12 sm:w-16'></div>
                  <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-8 sm:w-12'></div>
                </div>
                <div className='flex justify-between items-center'>
                  <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16 sm:w-20'></div>
                  <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12 sm:w-16'></div>
                </div>
                <div className='flex justify-between items-center'>
                  <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 sm:w-24'></div>
                  <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-10 sm:w-14'></div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6'>
              <div className='h-5 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-24 sm:w-32 mb-3 sm:mb-4'></div>
              <div className='space-y-2 sm:space-y-3'>
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className='h-10 sm:h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'
                  ></div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6'>
              <div className='h-5 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 sm:w-28 mb-3 sm:mb-4'></div>
              <div className='grid grid-cols-2 gap-2 sm:gap-3'>
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className='text-center'>
                    <div className='h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse mx-auto mb-2'></div>
                    <div className='h-2 sm:h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12 sm:w-16 mx-auto'></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Game History */}
        <div className='mt-6 sm:mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6'>
          <div className='h-5 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-32 sm:w-40 mb-4 sm:mb-6'></div>
          <div className='overflow-hidden'>
            <div className='grid grid-cols-6 gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 dark:border-gray-700'>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'
                ></div>
              ))}
            </div>
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className='grid grid-cols-6 gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 dark:border-gray-700'
              >
                {[1, 2, 3, 4, 5, 6].map((col) => (
                  <div
                    key={col}
                    className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardShimmer;
