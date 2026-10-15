import React, { useEffect } from 'react';
import { Navigate, Outlet, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Groups from './pages/Groups';
import Chat from './pages/Chat';
import Tasks from './pages/Tasks';

import Navbar from './components/Navbar';
import { Session } from './api';

const ProtectedRoutes = () => (
  Session.isLoggedIn() ? <Outlet /> : <Navigate to="/login" replace />
);

function App() {
  useEffect(() => {
    // Theme initialization
    const saved = localStorage.getItem('ss_theme') || 'dark';
    if (saved === 'light') document.body.classList.add('light-mode');
    
    // Dismiss loader
    const loader = document.getElementById('page-loader');
    if (loader) {
      setTimeout(() => loader.classList.add('hidden'), 600);
    }
  }, []);

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
        </Route>
      </Routes>
    </div>
  );
}

export default App;
