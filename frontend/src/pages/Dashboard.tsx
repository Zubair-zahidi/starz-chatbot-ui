// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Globe, 
  Database, 
  Satellite,
  CloudLightning,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { astronomicalApi } from '../services/api/astronomical';
import SolarSystem3D from '../components/visualization/SolarSystem3D';
import StatsCard from '../components/dashboard/StatsCard';
import SystemMonitor from '../components/dashboard/SystemMonitor';
import QuickActions from '../components/dashboard/QuickActions';

const Dashboard: React.FC = () => {
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);

  const { data: stats } = useQuery({
    queryKey: ['astronomical-stats'],
    queryFn: astronomicalApi.getStats,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(60 + Math.random() * 15);
      setMemoryUsage(45 + Math.random() * 20);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-orbitron text-3xl font-bold text-gradient mb-2">
            Cosmic Intelligence Dashboard
          </h1>
          <p className="text-stellar-silver">
            Real-time monitoring and astronomical data analysis
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg glass-effect">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold">QUANTUM ONLINE</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Stars Mapped"
          value={stats?.stars || '2.5B'}
          icon={<Globe className="w-5 h-5" />}
          trend={{ value: '+1,247/sec', isPositive: true }}
          color="from-stellar-blue to-stellar-teal"
        />
        <StatsCard
          title="Exoplanets Analyzed"
          value={stats?.exoplanets || '5.5K'}
          icon={<Database className="w-5 h-5" />}
          trend={{ value: '+12/sec', isPositive: true }}
          color="from-stellar-purple to-stellar-pink"
        />
        <StatsCard
          title="Galaxies Cataloged"
          value={stats?.galaxies || '200B'}
          icon={<Satellite className="w-5 h-5" />}
          trend={{ value: '+3/sec', isPositive: true }}
          color="from-stellar-teal to-stellar-blue"
        />
        <StatsCard
          title="Data Accuracy"
          value="99.98%"
          icon={<CloudLightning className="w-5 h-5" />}
          trend={{ value: 'Verified', isPositive: true }}
          color="from-stellar-pink to-stellar-purple"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 quantum-card p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-orbitron text-xl font-semibold">3D Solar System</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-lg bg-cosmic-matter hover:bg-stellar-blue/20 
                               transition-colors text-sm">
                Orbit
              </button>
              <button className="px-3 py-1 rounded-lg bg-cosmic-matter hover:bg-stellar-blue/20 
                               transition-colors text-sm">
                Labels
              </button>
            </div>
          </div>
          <div className="h-[400px] rounded-xl overflow-hidden">
            <SolarSystem3D />
          </div>
        </motion.div>

        {/* System Monitor */}
        <div className="space-y-6">
          <SystemMonitor
            cpuUsage={cpuUsage}
            memoryUsage={memoryUsage}
            dataStream={12.7}
            latency={3.2}
          />

          <QuickActions />
        </div>
      </div>

      {/* Data Stream */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="quantum-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-stellar-teal" />
          <h2 className="font-orbitron text-xl font-semibold">Real-time Data Stream</h2>
        </div>
        <div className="space-y-4">
          {[
            { id: 1, source: 'James Webb Telescope', data: 'Exoplanet atmospheric analysis complete', time: 'Just now' },
            { id: 2, source: 'Hubble Space Telescope', data: 'Galaxy NGC 4414 dark matter distribution updated', time: '2 min ago' },
            { id: 3, source: 'Chandra Observatory', data: 'Black hole merger gravitational waves detected', time: '5 min ago' },
            { id: 4, source: 'Gaia Mission', data: '3D star map updated with 1.8B new stars', time: '10 min ago' },
          ].map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-lg bg-cosmic-matter/50 
                         hover:bg-cosmic-matter transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-stellar-teal" />
                <div>
                  <p className="font-semibold">{item.source}</p>
                  <p className="text-sm text-stellar-silver">{item.data}</p>
                </div>
              </div>
              <span className="text-xs text-stellar-silver">{item.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
