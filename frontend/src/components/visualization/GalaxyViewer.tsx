import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

const GalaxyViewer: React.FC = () => {
  return (
    <Canvas camera={{ position: [0, 6, 12], fov: 60 }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[8, 8, 8]} intensity={1.2} />
      <Stars radius={200} depth={50} count={4000} factor={4} fade />
      <mesh>
        <torusKnotGeometry args={[2.5, 0.8, 180, 24]} />
        <meshStandardMaterial color="#0066ff" emissive="#00ffff" emissiveIntensity={0.25} />
      </mesh>
      <OrbitControls enablePan={false} />
    </Canvas>
  );
};

export default GalaxyViewer;
