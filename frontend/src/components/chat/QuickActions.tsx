import React from 'react';
import { Atom, AudioWaveform, Globe, Radiation } from 'lucide-react';

const ACTIONS = [
  { label: 'Dark Matter Analysis', icon: Atom, query: 'Analyze dark matter distribution in NGC 4414' },
  { label: 'Gravitational Waves', icon: AudioWaveform, query: 'Simulate black hole merger gravitational waves' },
  { label: 'Exoplanet Analysis', icon: Globe, query: 'Predict exoplanet atmospheric composition for TRAPPIST-1e' },
  { label: 'Gamma-ray Analysis', icon: Radiation, query: 'Calculate gamma-ray burst probability in local cluster' },
];

interface QuickActionsProps {
  onAction: (query: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button key={a.label} className="action-quantum" onClick={() => onAction(a.query)}>
            <Icon className="w-4 h-4" />
            {a.label}
          </button>
        );
      })}
    </div>
  );
};

export default QuickActions;
