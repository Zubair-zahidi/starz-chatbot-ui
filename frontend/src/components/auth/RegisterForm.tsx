import React, { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

interface RegisterFormProps {
  disabled?: boolean;
  onSubmit: (payload: RegisterPayload) => Promise<void> | void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ disabled, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({ email, username, password });
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
        <span className="text-sm text-stellar-silver">Username</span>
        <div className="mt-1 flex items-center gap-2 rounded-xl bg-cosmic-matter border border-stellar-blue/20 px-3">
          <User className="w-4 h-4 text-stellar-silver" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
            autoComplete="username"
            required
            disabled={disabled}
            className="w-full bg-transparent py-3 outline-none text-white placeholder-stellar-silver"
            placeholder="zubair_zahidi"
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
            autoComplete="new-password"
            required
            disabled={disabled}
            className="w-full bg-transparent py-3 outline-none text-white placeholder-stellar-silver"
            placeholder="At least 8 characters"
          />
        </div>
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-stellar-blue to-stellar-purple font-semibold
                   hover:opacity-95 transition-opacity disabled:opacity-60"
      >
        Create account
      </button>
    </form>
  );
};

export default RegisterForm;
