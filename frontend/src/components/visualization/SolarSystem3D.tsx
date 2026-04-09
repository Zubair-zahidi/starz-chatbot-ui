// src/components/visualization/SolarSystem3D.tsx
import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';

const SolarSystem3D: React.FC = () => {
  const [autoRotate] = useState(true);

  return (
    <Canvas
      camera={{ position: [0, 20, 40], fov: 60 }}
      className="rounded-xl"
    >
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffaa00" />
      <Suspense fallback={null}>
        <Stars radius={300} depth={50} count={5000} factor={4} />
        <Sun />
        <Planet name="Mercury" distance={8} size={0.4} color="#8c7853" speed={0.04} />
        <Planet name="Venus" distance={12} size={0.9} color="#e39e54" speed={0.015} />
        <Planet name="Earth" distance={16} size={1} color="#6b93d6" speed={0.01}>
          <Moon />
        </Planet>
        <Planet name="Mars" distance={20} size={0.5} color="#ff6b6b" speed={0.008} />
        <Planet name="Jupiter" distance={28} size={2.5} color="#e0a96d" speed={0.002} />
        <Planet name="Saturn" distance={36} size={2.2} color="#e3cda5" speed={0.001}>
          <Ring />
        </Planet>
        <Planet name="Uranus" distance={42} size={1.8} color="#b5e2e2" speed={0.0007} />
        <Planet name="Neptune" distance={48} size={1.7} color="#5b5bff" speed={0.0005} />
      </Suspense>
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        minDistance={10}
        maxDistance={100}
      />
      <gridHelper args={[100, 100]} rotation={[Math.PI / 2, 0, 0]} />
    </Canvas>
  );
};

const Sun: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[3, 32, 32]} />
      <meshStandardMaterial
        color="#ffaa00"
        emissive="#ff5500"
        emissiveIntensity={0.5}
      />
      <pointLight intensity={2} color="#ffaa00" />
    </mesh>
  );
};

interface PlanetProps {
  name: string;
  distance: number;
  size: number;
  color: string;
  speed: number;
  children?: React.ReactNode;
}

const Planet: React.FC<PlanetProps> = ({
  name,
  distance,
  size,
  color,
  speed,
  children,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += speed;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Orbit */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[distance, distance + 0.1, 64]} />
        <meshBasicMaterial color="#0066ff" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Planet */}
      <mesh ref={meshRef} position={[distance, 0, 0]}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial color={color} />
        {children}
      </mesh>

      {/* Label */}
      <Text
        position={[distance, size + 0.5, 0]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  );
};

const Moon: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={[2, 0, 0]}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="#cccccc" />
    </mesh>
  );
};

const Ring: React.FC = () => {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.5, 3.5, 64]} />
      <meshStandardMaterial color="#e3cda5" side={THREE.DoubleSide} />
    </mesh>
  );
};

export default SolarSystem3D;
