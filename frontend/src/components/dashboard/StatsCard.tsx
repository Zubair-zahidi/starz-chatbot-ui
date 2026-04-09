import React from 'react';
import { TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: string; isPositive: boolean };
  color: string; // tailwind gradient string: "from-x to-y"
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, color }) => {
  return (
    <div className="quantum-card p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-stellar-silver">{title}</p>
          <p className="font-orbitron text-2xl font-bold">{value}</p>
        </div>
        <div
          className={[
            'w-11 h-11 rounded-2xl bg-gradient-to-r',
            color,
            'flex items-center justify-center shadow-lg',
          ].join(' ')}
        >
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {trend.value.toLowerCase() === 'verified' ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : trend.isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <span className={trend.isPositive ? 'text-green-300' : 'text-red-300'}>{trend.value}</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
