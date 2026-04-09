import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [busy, setBusy] = useState(false);

  const from = (location.state as any)?.from || '/dashboard';

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md quantum-card p-8">
        <div className="mb-6">
          <h1 className="font-orbitron text-2xl font-bold text-gradient">STARZ</h1>
          <p className="text-stellar-silver mt-1">Enterprise Cosmic Intelligence Platform</p>
        </div>

        <LoginForm
          disabled={busy}
          onSubmit={async (email, password) => {
            setBusy(true);
            try {
              await login(email, password);
              navigate(from, { replace: true });
            } finally {
              setBusy(false);
            }
          }}
        />

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-stellar-silver">New here?</span>
          <Link className="text-stellar-teal hover:text-stellar-blue transition-colors" to="/register">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

