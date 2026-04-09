import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const StarMap: React.FC = () => {
  return (
    <Canvas camera={{ position: [0, 0, 18], fov: 60 }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Points />
      <OrbitControls />
    </Canvas>
  );
};

const Points: React.FC = () => {
  const points = React.useMemo(() => {
    const arr: Array<{ x: number; y: number; z: number; s: number }> = [];
    for (let i = 0; i < 800; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 30,
        y: (Math.random() - 0.5) * 30,
        z: (Math.random() - 0.5) * 30,
        s: Math.random() * 0.12 + 0.02,
      });
    }
    return arr;
  }, []);

  return (
    <>
      {points.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.s, 8, 8]} />
          <meshStandardMaterial color="#c0c0ff" emissive="#00ffff" emissiveIntensity={0.12} />
        </mesh>
      ))}
    </>
  );
};

export default StarMap;
