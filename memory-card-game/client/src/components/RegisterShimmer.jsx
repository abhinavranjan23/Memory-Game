import React from "react";

const RegisterShimmer = () => {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-sm sm:max-w-md w-full space-y-6 sm:space-y-8'>
        {/* Header Shimmer */}
        <div className='text-center'>
          <div className='h-6 sm:h-8 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse max-w-36 sm:max-w-48 mx-auto mb-2'></div>
          <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse max-w-48 sm:max-w-64 mx-auto'></div>
        </div>

        {/* Form Shimmer */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8'>
          {/* Username Field */}
          <div className='mb-4 sm:mb-6'>
            <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16 sm:w-20 mb-2'></div>
            <div className='h-10 sm:h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'></div>
          </div>

          {/* Email Field */}
          <div className='mb-4 sm:mb-6'>
            <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12 sm:w-16 mb-2'></div>
            <div className='h-10 sm:h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'></div>
          </div>

          {/* Password Field */}
          <div className='mb-4 sm:mb-6'>
            <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20 sm:w-24 mb-2'></div>
            <div className='h-10 sm:h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'></div>
          </div>

          {/* Confirm Password Field */}
          <div className='mb-4 sm:mb-6'>
            <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-28 sm:w-32 mb-2'></div>
            <div className='h-10 sm:h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse'></div>
          </div>

          {/* Terms Checkbox */}
          <div className='mb-4 sm:mb-6'>
            <div className='flex items-center'>
              <div className='h-4 w-4 sm:h-5 sm:w-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mr-3'></div>
              <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse flex-1'></div>
            </div>
          </div>

          {/* Submit Button */}
          <div className='h-10 sm:h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse mb-4'></div>

          {/* Divider */}
          <div className='flex items-center my-4 sm:my-6'>
            <div className='flex-1 h-px bg-gray-300 dark:bg-gray-600'></div>
            <div className='px-3 sm:px-4'>
              <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-12 sm:w-16'></div>
            </div>
            <div className='flex-1 h-px bg-gray-300 dark:bg-gray-600'></div>
          </div>

          {/* Login Link */}
          <div className='text-center'>
            <div className='h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse max-w-36 sm:max-w-48 mx-auto'></div>
          </div>
        </div>

        {/* Footer Shimmer */}
        <div className='text-center'>
          <div className='h-2 sm:h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse max-w-48 sm:max-w-64 mx-auto'></div>
        </div>
      </div>
    </div>
  );
};

export default RegisterShimmer;
