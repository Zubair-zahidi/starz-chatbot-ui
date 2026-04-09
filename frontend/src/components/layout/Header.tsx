// src/components/layout/Header.tsx
import React, { useState } from 'react';
import { Menu, X, Bell, Search, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';

interface HeaderProps {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ isMenuOpen, onToggleMenu }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-50 glass-effect border-b border-stellar-blue/20">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleMenu}
              className="lg:hidden text-stellar-teal"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-3">
              <QuantumLogo />
              <div>
                <h1 className="font-orbitron font-bold text-2xl text-gradient">
                  STARZ
                </h1>
                <p className="text-xs text-stellar-silver">
                  Real-time Cosmic Intelligence • Zubair Zahidi
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stellar-silver" size={20} />
              <input
                type="text"
                placeholder="Search astronomical data, queries, or celestial objects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-cosmic-matter border border-stellar-blue/30 
                         text-white placeholder-stellar-silver focus:outline-none focus:border-stellar-teal
                         focus:ring-1 focus:ring-stellar-teal transition-all"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-cosmic-matter rounded-lg transition-colors">
              <Bell size={20} className="text-stellar-silver" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-stellar-pink rounded-full" />
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-cosmic-matter px-3 py-2 rounded-lg transition-colors">
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={user?.avatar}
                        alt={user?.username}
                        className="rounded-full"
                      />
                      <AvatarFallback className="bg-gradient-to-r from-stellar-blue to-stellar-purple 
                                                rounded-full w-8 h-8 flex items-center justify-center text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold">{user?.username}</p>
                      <p className="text-xs text-stellar-silver capitalize">{user?.role}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-effect rounded-lg border border-stellar-blue/20 
                                              p-2 shadow-xl">
                  <DropdownMenuLabel className="text-stellar-silver px-2">
                    {user?.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2 border-stellar-blue/20" />
                  <DropdownMenuItem className="flex items-center gap-2 px-2 py-2 rounded 
                                             hover:bg-cosmic-matter cursor-pointer">
                    <User size={16} />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 px-2 py-2 rounded 
                                             hover:bg-cosmic-matter cursor-pointer">
                    <Settings size={16} />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2 border-stellar-blue/20" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="flex items-center gap-2 px-2 py-2 rounded hover:bg-red-500/20 
                             text-red-400 cursor-pointer"
                  >
                    <LogOut size={16} />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg bg-cosmic-matter hover:bg-stellar-blue/20 transition-colors text-sm font-semibold"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-stellar-blue to-stellar-purple text-sm font-semibold"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const QuantumLogo: React.FC = () => {
  return (
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-stellar-blue to-stellar-purple 
                    animate-pulse-glow" />
      <div className="absolute inset-1 rounded-lg bg-cosmic-black flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-stellar-teal to-stellar-pink 
                      animate-spin-slow" />
      </div>
      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-stellar-teal animate-ping" />
    </div>
  );
};

export default Header;
