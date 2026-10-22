// src/components/layout/Layout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/authState';

const Layout: React.FC = () => {
  useAuth(); // ensure auth context initialized for layout
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header isMenuOpen={mobileNavOpen} onToggleMenu={() => setMobileNavOpen((v) => !v)} />
      <div className="flex flex-1">
        <Sidebar />
        <Sidebar mode="mobile" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <QuantumFooter />
    </div>
  );
};

const QuantumFooter: React.FC = () => {
  return (
    <footer className="border-t border-stellar-blue/20 py-6 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-stellar-blue to-stellar-purple" />
          <span className="font-orbitron font-bold text-lg text-gradient">
            STARZ
          </span>
          <span className="text-sm text-stellar-silver ml-2">
            Enterprise Cosmic Intelligence Platform
          </span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="text-stellar-silver hover:text-stellar-teal transition-colors">
            Privacy
          </a>
          <a href="#" className="text-stellar-silver hover:text-stellar-teal transition-colors">
            Terms
          </a>
          <a href="#" className="text-stellar-silver hover:text-stellar-teal transition-colors">
            API Docs
          </a>
          <span className="text-stellar-silver text-sm">
            v4.2.1 • Developed by Zubair Zahidi
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Layout;

