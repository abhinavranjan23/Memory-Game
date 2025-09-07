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
import RegisteredUserRoute from "./components/RegisteredUserRoute.jsx";
import ServerLoadingPopup from "./components/ServerLoadingPopup.jsx";
import Navbar from "./components/layout/Navbar.jsx";
import CookieConsent from "./components/CookieConsent";
import GameLoadingScreen from "./components/GameLoadingScreen.jsx";
import HomeShimmer from "./components/HomeShimmer.jsx";
import RegisterShimmer from "./components/RegisterShimmer.jsx";
import LeaderboardShimmer from "./components/LeaderboardShimmer.jsx";
import DashboardShimmer from "./components/DashboardShimmer.jsx";
import LoginShimmer from "./components/LoginShimmer.jsx";
import ProfileShimmer from "./components/ProfileShimmer.jsx";
import "./App.css";

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

function AppContent() {
  const location = useLocation();
  const isGamePage = location.pathname.startsWith("/game/" || "/waiting");

  const getLoadingComponent = () => {
    const path = location.pathname;

    if (path === "/") return <HomeShimmer />;
    if (path === "/login") return <LoginShimmer />;
    if (path === "/register") return <RegisterShimmer />;
    if (path === "/leaderboard") return <LeaderboardShimmer />;
    if (path === "/dashboard") return <DashboardShimmer />;
    if (path === "/profile") return <ProfileShimmer />;

    return <GameLoadingScreen />;
  };

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
                <RegisteredUserRoute>
                  <Dashboard />
                </RegisteredUserRoute>
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
                <RegisteredUserRoute>
                  <Profile />
                </RegisteredUserRoute>
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
