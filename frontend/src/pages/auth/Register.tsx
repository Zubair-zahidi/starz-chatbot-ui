import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import RegisterForm from '../../components/auth/RegisterForm';
import { useAuth } from '../../contexts/authState';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, register } = useAuth();
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md quantum-card p-8">
        <div className="mb-6">
          <h1 className="font-orbitron text-2xl font-bold text-gradient">Create Account</h1>
          <p className="text-stellar-silver mt-1">Join STARZ in under a minute.</p>
        </div>

        <RegisterForm
          disabled={busy}
          onSubmit={async (data) => {
            setBusy(true);
            try {
              await register(data);
              navigate('/dashboard', { replace: true });
            } finally {
              setBusy(false);
            }
          }}
        />

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-stellar-silver">Already have an account?</span>
          <Link className="text-stellar-teal hover:text-stellar-blue transition-colors" to="/login">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;


