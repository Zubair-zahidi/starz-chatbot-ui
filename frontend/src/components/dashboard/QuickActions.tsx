import React from 'react';
import { Atom, AudioWaveform, Globe, Radiation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const actions = [
  { label: 'Dark Matter Analysis', icon: <Atom className="w-4 h-4" />, query: 'Analyze dark matter distribution in NGC 4414' },
  { label: 'Gravitational Waves', icon: <AudioWaveform className="w-4 h-4" />, query: 'Simulate black hole merger gravitational waves' },
  { label: 'Exoplanet Analysis', icon: <Globe className="w-4 h-4" />, query: 'Predict exoplanet atmospheric composition for TRAPPIST-1e' },
  { label: 'Gamma-ray Analysis', icon: <Radiation className="w-4 h-4" />, query: 'Calculate gamma-ray burst probability in local cluster' },
];

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="quantum-card p-6">
      <h3 className="font-orbitron text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => {
              // For now we just route to chat; the chat page has its own quick actions too.
              navigate('/chat', { state: { seed: a.query } });
            }}
            className="action-quantum"
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
