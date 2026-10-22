import React, { useEffect } from 'react';
import { Navigate, Outlet, Routes, Route } from 'react-router-dom';
import { useAppSelector } from './hooks/useRedux';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Groups from './pages/Groups';
import Chat from './pages/Chat';
import Tasks from './pages/Tasks';
import SessionRoom from './pages/SessionRoom';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import Matches from './pages/Matches';

import Navbar from './components/Navbar';

const ProtectedRoutes = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  const themeMode = useAppSelector((state) => state.theme.mode);

  useEffect(() => {
    // Theme sync
    if (themeMode === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }

    // Dismiss loader
    const loader = document.getElementById('page-loader');
    if (loader) {
      setTimeout(() => loader.classList.add('hidden'), 600);
    }
  }, [themeMode]);

  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/sessions/:id" element={<SessionRoom />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
