import React, { useState } from 'react';
import { Orbit, Sparkles } from 'lucide-react';
import GalaxyViewer from '../components/visualization/GalaxyViewer';
import StarMap from '../components/visualization/StarMap';

const Visualizations: React.FC = () => {
  const [tab, setTab] = useState<'galaxy' | 'starmap'>('galaxy');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="font-orbitron text-3xl font-bold text-gradient mb-2">Visualizations</h1>
          <p className="text-stellar-silver">Interactive cosmic views for analysis and exploration.</p>
        </div>
        <div className="flex gap-2 glass-effect rounded-2xl p-2">
          <button
            onClick={() => setTab('galaxy')}
            className={[
              'px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors',
              tab === 'galaxy' ? 'bg-stellar-blue/20 text-white' : 'text-stellar-silver hover:bg-cosmic-matter',
            ].join(' ')}
          >
            <Orbit className="w-4 h-4" /> Galaxy
          </button>
          <button
            onClick={() => setTab('starmap')}
            className={[
              'px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors',
              tab === 'starmap' ? 'bg-stellar-purple/20 text-white' : 'text-stellar-silver hover:bg-cosmic-matter',
            ].join(' ')}
          >
            <Sparkles className="w-4 h-4" /> Star Map
          </button>
        </div>
      </div>

      <div className="quantum-card p-6">
        <div className="h-[520px] rounded-2xl overflow-hidden bg-cosmic-matter/30 border border-stellar-blue/10">
          {tab === 'galaxy' ? <GalaxyViewer /> : <StarMap />}
        </div>
      </div>
    </div>
  );
};

export default Visualizations;
