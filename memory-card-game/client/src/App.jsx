import React, { Suspense, lazy, useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { SocketProvider } from "./contexts/SocketContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import ServerLoadingPopup from "./components/ServerLoadingPopup.jsx";
import Navbar from "./components/layout/Navbar.jsx";
import CookieConsent from "./components/CookieConsent";
import GameLoadingScreen from "./components/GameLoadingScreen.jsx";
import HomeShimmer from "./components/HomeShimmer.jsx";
import RegisterShimmer from "./components/RegisterShimmer.jsx";
import LeaderboardShimmer from "./components/LeaderboardShimmer.jsx";
import DashboardShimmer from "./components/DashboardShimmer.jsx";
import "./App.css";

// Lazy load pages for better performance
const Home = lazy(() => import("./pages/Home.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Game = lazy(() => import("./pages/Game.jsx"));
const Lobby = lazy(() => import("./pages/Lobby.jsx"));
const WaitingArea = lazy(() => import("./pages/WaitingArea.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Leaderboard = lazy(() => import("./pages/Leaderboard.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

// Component to conditionally render Navbar and loading screens
function AppContent() {
  const location = useLocation();
  const isGamePage = location.pathname.startsWith("/game/");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set a small delay to allow React Router to determine the route
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Get the appropriate loading component based on the current route
  const getLoadingComponent = () => {
    const path = location.pathname;

    if (path === "/") return <HomeShimmer />;
    if (path === "/register") return <RegisterShimmer />;
    if (path === "/leaderboard") return <LeaderboardShimmer />;
    if (path === "/dashboard") return <DashboardShimmer />;

    // Default loading screen for other pages
    return <GameLoadingScreen />;
  };

  if (isLoading) {
    return getLoadingComponent();
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300'>
      {!isGamePage && <Navbar />}
      <main className='container mx-auto'>
        <Suspense fallback={getLoadingComponent()}>
          <Routes>
            {/* Public routes */}
            <Route path='/' element={<Home />} />
            <Route
              path='/login'
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path='/register'
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route path='/leaderboard' element={<Leaderboard />} />
            {/* Protected routes */}
            <Route
              path='/dashboard'
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path='/lobby'
              element={
                <ProtectedRoute>
                  <Lobby />
                </ProtectedRoute>
              }
            />
            <Route
              path='/waiting/:roomId'
              element={
                <ProtectedRoute>
                  <WaitingArea />
                </ProtectedRoute>
              }
            />
            <Route
              path='/game/:roomId'
              element={
                <ProtectedRoute>
                  <Game />
                </ProtectedRoute>
              }
            />
            <Route
              path='/profile'
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path='/admin'
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path='*' element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {/* Server Loading Popup */}
      <ServerLoadingPopup />

      {/* Cookie Consent */}
      <CookieConsent />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
