import React from 'react';
import { Cpu, HardDrive, Activity, Timer } from 'lucide-react';

interface SystemMonitorProps {
  cpuUsage: number;
  memoryUsage: number;
  dataStream: number;
  latency: number;
}

const Metric: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="p-4 rounded-2xl bg-cosmic-matter/40 border border-stellar-blue/10">
    <div className="flex items-center justify-between">
      <span className="text-sm text-stellar-silver">{label}</span>
      <span className="text-stellar-teal">{icon}</span>
    </div>
    <div className="mt-2 font-orbitron text-xl">{value}</div>
  </div>
);

const SystemMonitor: React.FC<SystemMonitorProps> = ({ cpuUsage, memoryUsage, dataStream, latency }) => {
  return (
    <div className="quantum-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Cpu className="w-5 h-5 text-stellar-teal" />
        <h3 className="font-orbitron text-lg font-semibold">Quantum Processor Status</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Metric label="CPU Usage" value={`${cpuUsage.toFixed(1)}%`} icon={<Cpu className="w-4 h-4" />} />
        <Metric
          label="Memory"
          value={`${memoryUsage.toFixed(1)}%`}
          icon={<HardDrive className="w-4 h-4" />}
        />
        <Metric label="Data Stream" value={`${dataStream.toFixed(1)} GB/s`} icon={<Activity className="w-4 h-4" />} />
        <Metric label="Latency" value={`${latency.toFixed(1)} ms`} icon={<Timer className="w-4 h-4" />} />
      </div>
    </div>
  );
};

export default SystemMonitor;
