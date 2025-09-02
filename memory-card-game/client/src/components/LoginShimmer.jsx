import React from "react";

const LoginShimmer = () => {
  return (
    <div className='relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4'>
      <div className='w-full max-w-md relative z-10'>
        {/* Main card with animated border */}
        <div className='relative'>
          <div className='relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl p-6 border border-white/20 dark:border-gray-700/50'>
            {/* Header */}
            <div className='text-center mb-6'>
              {/* Icon shimmer */}
              <div className='w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-2xl mx-auto mb-4 animate-pulse'></div>

              {/* Title shimmer */}
              <div className='h-8 sm:h-10 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse max-w-48 sm:max-w-56 mx-auto mb-2'></div>

              {/* Subtitle shimmer */}
              <div className='h-4 sm:h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse max-w-64 sm:max-w-72 mx-auto'></div>
            </div>

            {/* Form */}
            <div className='space-y-6'>
              {/* Email/Username field */}
              <div>
                {/* Label shimmer */}
                <div className='h-4 sm:h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-32 sm:w-36 mb-2'></div>

                {/* Input field shimmer */}
                <div className='relative'>
                  {/* Icon shimmer */}
                  <div className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>

                  {/* Input shimmer */}
                  <div className='w-full pl-10 pr-4 py-3 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse'></div>
                </div>
              </div>

              {/* Password field */}
              <div>
                {/* Label shimmer */}
                <div className='h-4 sm:h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 sm:w-24 mb-2'></div>

                {/* Input field shimmer */}
                <div className='relative'>
                  {/* Icon shimmer */}
                  <div className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>

                  {/* Input shimmer */}
                  <div className='w-full pl-10 pr-12 py-3 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse'></div>

                  {/* Eye icon shimmer */}
                  <div className='absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
                </div>
              </div>

              {/* Sign In button */}
              <div className='w-full h-12 sm:h-14 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse'></div>
            </div>

            {/* Divider */}
            <div className='mt-6'>
              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-gray-300 dark:border-gray-600'></div>
                </div>
                <div className='relative flex justify-center text-sm'>
                  <div className='px-4 bg-white/80 dark:bg-gray-800/80'>
                    <div className='h-4 sm:h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-24 sm:w-28'></div>
                  </div>
                </div>
              </div>

              {/* Guest login button */}
              <div className='w-full h-12 sm:h-14 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse mt-4'></div>
            </div>

            {/* Sign up link */}
            <div className='mt-6 text-center'>
              <div className='h-4 sm:h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse max-w-48 sm:max-w-56 mx-auto'></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginShimmer;
