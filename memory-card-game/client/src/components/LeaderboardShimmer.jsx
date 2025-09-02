import React from "react";

const LeaderboardShimmer = () => {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8'>
        {/* Header Shimmer */}
        <div className='text-center mb-6 sm:mb-8'>
          <div className='h-8 sm:h-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse max-w-48 sm:max-w-64 mx-auto mb-3 sm:mb-4'></div>
          <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse max-w-sm sm:max-w-2xl mx-auto'></div>
        </div>

        {/* Stats Cards Shimmer */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8'>
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className='bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg'
            >
              <div className='h-5 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-2 sm:mb-3'></div>
              <div className='h-6 sm:h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-2'></div>
              <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-2/3'></div>
            </div>
          ))}
        </div>

        {/* Filters Shimmer */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8'>
          <div className='flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between'>
            <div className='flex gap-3 sm:gap-4'>
              <div className='h-8 sm:h-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse w-24 sm:w-32'></div>
              <div className='h-8 sm:h-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse w-24 sm:w-32'></div>
            </div>
            <div className='h-8 sm:h-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse w-full sm:w-48'></div>
          </div>
        </div>

        {/* Leaderboard Table Shimmer */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden'>
          {/* Table Header */}
          <div className='px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700'>
            <div className='grid grid-cols-12 gap-2 sm:gap-4'>
              <div className='col-span-1'>
                <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
              </div>
              <div className='col-span-3'>
                <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
              </div>
              <div className='col-span-2'>
                <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
              </div>
              <div className='col-span-2'>
                <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
              </div>
              <div className='col-span-2'>
                <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
              </div>
              <div className='col-span-2'>
                <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
              </div>
            </div>
          </div>

          {/* Table Rows */}
          <div className='divide-y divide-gray-200 dark:divide-gray-700'>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
              <div
                key={item}
                className='px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                <div className='grid grid-cols-12 gap-2 sm:gap-4 items-center'>
                  {/* Rank */}
                  <div className='col-span-1'>
                    <div className='h-5 w-5 sm:h-6 sm:w-6 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse'></div>
                  </div>

                  {/* Player */}
                  <div className='col-span-3'>
                    <div className='flex items-center space-x-2 sm:space-x-3'>
                      <div className='h-8 w-8 sm:h-10 sm:w-10 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse'></div>
                      <div className='space-y-1'>
                        <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 sm:w-24'></div>
                        <div className='h-2 sm:h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12 sm:w-16'></div>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className='col-span-2'>
                    <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12 sm:w-16'></div>
                  </div>

                  {/* Games Played */}
                  <div className='col-span-2'>
                    <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-8 sm:w-12'></div>
                  </div>

                  {/* Win Rate */}
                  <div className='col-span-2'>
                    <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12 sm:w-16'></div>
                  </div>

                  {/* Best Time */}
                  <div className='col-span-2'>
                    <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16 sm:w-20'></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Shimmer */}
        <div className='mt-6 sm:mt-8 flex justify-center'>
          <div className='flex space-x-2'>
            <div className='h-8 w-8 sm:h-10 sm:w-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'></div>
            <div className='h-8 w-8 sm:h-10 sm:w-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'></div>
            <div className='h-8 w-8 sm:h-10 sm:w-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'></div>
            <div className='h-8 w-8 sm:h-10 sm:w-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'></div>
            <div className='h-8 w-8 sm:h-10 sm:w-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardShimmer;
