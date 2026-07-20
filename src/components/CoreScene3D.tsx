import { Float, Sparkles } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

function CapitalCore({ progress }: { progress: number }) {
  const group = useRef<Group>(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.14;
    group.current.rotation.x = state.pointer.y * 0.1;
    group.current.rotation.z = state.pointer.x * 0.08;
  });
  const intensity = 1.4 + Math.min(progress, 100) / 90;
  return (
    <group ref={group}>
      <Float speed={1.2} rotationIntensity={0.16} floatIntensity={0.35}>
        <mesh>
          <icosahedronGeometry args={[1.18, 2]} />
          <meshStandardMaterial
            color="#45f4b0"
            emissive="#0dd990"
            emissiveIntensity={intensity}
            roughness={0.18}
            metalness={0.42}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.62, 0.026, 12, 100]} />
          <meshBasicMaterial color="#62ddff" toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2.8, 0.3, 0.7]}>
          <torusGeometry args={[1.84, 0.018, 12, 100]} />
          <meshBasicMaterial color="#d5b96b" toneMapped={false} />
        </mesh>
      </Float>
      <Sparkles count={32} scale={4.4} size={1.8} speed={0.3} color="#74ffd0" />
    </group>
  );
}

export default function CoreScene3D({ progress }: { progress: number }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 3, 4]} color="#63ffd2" intensity={7} />
      <pointLight position={[-3, -2, 3]} color="#56b8ff" intensity={5} />
      <CapitalCore progress={progress} />
    </Canvas>
  );
}
