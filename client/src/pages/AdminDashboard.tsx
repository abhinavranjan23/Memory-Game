import React from 'react';

const AdminDashboard: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Admin Dashboard
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          System monitoring and moderation
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
          <p className="text-gray-600 dark:text-gray-300">
            🛠️ Coming soon! User management, game monitoring, and system statistics.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;