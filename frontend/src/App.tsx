// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Chats from './pages/Chat';
import Visualizations from './pages/Visualizations';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Login from './pages/Auth';
import Register from './pages/auth/Register';
import ProtectedRoute from './components/auth/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-cosmic-black">
              <QuantumBackground />
              <Routes>
                <Route path="/" element={<Navigate to="/chat" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                {/* Public: Chat (guest mode until 4 messages) */}
                <Route element={<Layout />}>
                  <Route path="/chat" element={<Chats />} />
                </Route>

                {/* Protected: Everything else */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/visualizations" element={<Visualizations />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/admin" element={<Admin />} />
                  </Route>
                </Route>
              </Routes>
              <Toaster
                position="top-right"
                toastOptions={{
                  className: 'glass-effect',
                  style: {
                    background: 'rgba(26, 26, 46, 0.9)',
                    color: '#fff',
                    border: '1px solid rgba(0, 102, 255, 0.3)',
                  },
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const QuantumBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-3] overflow-hidden">
      <div className="absolute inset-0 bg-cosmic-black" />
      <div className="absolute inset-0 quantum-grid" />
      <div className="absolute inset-0 bg-gradient-to-br from-stellar-blue/10 via-stellar-purple/5 to-transparent" />
      <ParticleField />
    </div>
  );
};

const ParticleField: React.FC = () => {
  return (
    <div className="absolute inset-0">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-stellar-teal"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.5 + 0.2,
            animation: `float ${Math.random() * 5 + 3}s infinite ease-in-out`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
};

export default App;
