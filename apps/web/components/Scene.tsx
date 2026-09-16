"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useServices } from "@/lib/useServices";

function ServiceNode({ position, name }: { position: [number, number, number]; name: string }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#4f9eff" />
    </mesh>
  );
}

function ServiceGraph() {
  const { data: services, isLoading, error } = useServices();

  if (isLoading || !services) return null;
  if (error) return null;

  return (
    <>
      {services.map((service, i) => {
        // Simple circular layout for now — spread nodes evenly around a circle.
        // We'll replace this with a real force-directed layout in a later stage.
        const angle = (i / services.length) * Math.PI * 2;
        const radius = 4;
        const position: [number, number, number] = [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        ];

        return <ServiceNode key={service.id} position={position} name={service.name} />;
      })}
    </>
  );
}

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 5, 10] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <ServiceGraph />
      <OrbitControls />
    </Canvas>
  );
}