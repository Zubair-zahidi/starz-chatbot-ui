// src/components/layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Orbit, User, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/authState';

const linkBase =
  'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors border border-transparent';

interface SidebarProps {
  mode?: 'desktop' | 'mobile';
  open?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mode = 'desktop', open = false, onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: '/chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
    { to: '/visualizations', label: 'Visualizations', icon: <Orbit className="w-5 h-5" /> },
    { to: '/profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  if (mode === 'mobile') {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-[55] lg:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          aria-label="Close navigation"
          onClick={onClose}
        />
        <aside className="absolute left-0 top-0 h-full w-[min(20rem,86vw)] p-4 border-r border-stellar-blue/20 glass-effect">
          <nav className="space-y-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    linkBase,
                    isActive
                      ? 'bg-stellar-blue/15 border-stellar-blue/30 text-white'
                      : 'text-stellar-silver hover:bg-cosmic-matter hover:text-white',
                  ].join(' ')
                }
                end={l.to === '/dashboard'}
              >
                <span className="text-stellar-teal">{l.icon}</span>
                <span className="font-semibold">{l.label}</span>
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    linkBase,
                    isActive
                      ? 'bg-stellar-purple/15 border-stellar-purple/30 text-white'
                      : 'text-stellar-silver hover:bg-cosmic-matter hover:text-white',
                  ].join(' ')
                }
              >
                <span className="text-stellar-pink">
                  <Shield className="w-5 h-5" />
                </span>
                <span className="font-semibold">Admin</span>
              </NavLink>
            )}
          </nav>
        </aside>
      </div>
    );
  }

  return (
    <aside className="hidden lg:block w-72 p-4 border-r border-stellar-blue/20 glass-effect">
      <nav className="space-y-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              [
                linkBase,
                isActive
                  ? 'bg-stellar-blue/15 border-stellar-blue/30 text-white'
                  : 'text-stellar-silver hover:bg-cosmic-matter hover:text-white',
              ].join(' ')
            }
            end={l.to === '/dashboard'}
          >
            <span className="text-stellar-teal">{l.icon}</span>
            <span className="font-semibold">{l.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              [
                linkBase,
                isActive
                  ? 'bg-stellar-purple/15 border-stellar-purple/30 text-white'
                  : 'text-stellar-silver hover:bg-cosmic-matter hover:text-white',
              ].join(' ')
            }
          >
            <span className="text-stellar-pink">
              <Shield className="w-5 h-5" />
            </span>
            <span className="font-semibold">Admin</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
