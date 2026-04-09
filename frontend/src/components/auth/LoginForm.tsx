import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';

interface LoginFormProps {
  disabled?: boolean;
  onSubmit: (email: string, password: string) => Promise<void> | void;
}

const LoginForm: React.FC<LoginFormProps> = ({ disabled, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(email, password);
      }}
    >
      <label className="block">
        <span className="text-sm text-stellar-silver">Email</span>
        <div className="mt-1 flex items-center gap-2 rounded-xl bg-cosmic-matter border border-stellar-blue/20 px-3">
          <Mail className="w-4 h-4 text-stellar-silver" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
            disabled={disabled}
            className="w-full bg-transparent py-3 outline-none text-white placeholder-stellar-silver"
            placeholder="you@domain.com"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-sm text-stellar-silver">Password</span>
        <div className="mt-1 flex items-center gap-2 rounded-xl bg-cosmic-matter border border-stellar-blue/20 px-3">
          <Lock className="w-4 h-4 text-stellar-silver" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
            disabled={disabled}
            className="w-full bg-transparent py-3 outline-none text-white placeholder-stellar-silver"
            placeholder="••••••••"
          />
        </div>
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-stellar-blue to-stellar-purple font-semibold
                   hover:opacity-95 transition-opacity disabled:opacity-60"
      >
        Sign in
      </button>
    </form>
  );
};

export default LoginForm;
