import React, { useState } from 'react';
import { Save, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api/auth';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-orbitron text-3xl font-bold text-gradient mb-2">Profile</h1>
        <p className="text-stellar-silver">Account identity and preferences.</p>
      </div>

      <div className="quantum-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-stellar-blue to-stellar-teal flex items-center justify-center">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">{user?.email}</p>
            <p className="text-sm text-stellar-silver capitalize">
              {user?.role} • {user?.subscription}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <span className="text-sm text-stellar-silver">Avatar</span>
          <div className="mt-2 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-cosmic-matter border border-stellar-blue/20">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const { avatar } = await authApi.updateAvatar(file);
                updateUser({ avatar });
              }}
              className="text-sm text-stellar-silver"
            />
          </div>
        </div>

        <label className="block max-w-lg">
          <span className="text-sm text-stellar-silver">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-xl bg-cosmic-matter border border-stellar-blue/20 px-4 py-3 outline-none"
          />
        </label>

        <div className="mt-6">
          <button
            onClick={async () => {
              try {
                const saved = await authApi.updateProfile({ username });
                updateUser(saved);
                toast.success('Profile updated');
              } catch (e: any) {
                toast.error(e?.message || 'Failed to update profile');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stellar-blue/20 hover:bg-stellar-blue/30 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save changes
          </button>
        </div>
      </div>

      <div className="quantum-card p-6 border border-red-500/20">
        <h2 className="font-orbitron text-xl font-semibold mb-2">Danger Zone</h2>
        <p className="text-stellar-silver text-sm mb-4">
          Delete your account and all associated chat sessions. This cannot be undone.
        </p>

        <label className="block max-w-lg">
          <span className="text-sm text-stellar-silver">Confirm Password</span>
          <input
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl bg-cosmic-matter border border-red-500/20 px-4 py-3 outline-none"
            placeholder="Enter your password to confirm"
          />
        </label>

        <div className="mt-4">
          <button
            disabled={!deletePassword || deleting}
            onClick={async () => {
              if (!deletePassword) return;
              const ok = confirm('Delete your STARZ account permanently? This cannot be undone.');
              if (!ok) return;

              setDeleting(true);
              try {
                await authApi.deleteMe(deletePassword);
                logout();
                toast.success('Account deleted');
                navigate('/chat');
              } catch (e: any) {
                const msg = e?.response?.data?.error?.message || e?.message || 'Failed to delete account';
                toast.error(msg);
              } finally {
                setDeleting(false);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors disabled:opacity-50"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
