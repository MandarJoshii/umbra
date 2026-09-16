"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import { useServices, type Service } from "@/lib/useServices";
import { useSpans } from "@/lib/useSpans";
import { useLiveFeed } from "@/lib/useLiveFeed";
import { useMemo } from "react";

function ServiceNode({ position, name }: { position: [number, number, number]; name: string }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#4f9eff" />
      </mesh>
      <Text
        position={[0, 0.9, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  );
}

function getServicePositions(services: Service[]): Map<number, [number, number, number]> {
  const positions = new Map<number, [number, number, number]>();
  const radius = 4;

  services.forEach((service, i) => {
    const angle = (i / services.length) * Math.PI * 2;
    positions.set(service.id, [Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
  });

  return positions;
}

function ServiceGraph() {
  useLiveFeed();
  const { data: services, isLoading: servicesLoading } = useServices();
  const { data: spans, isLoading: spansLoading } = useSpans();

  const positions = useMemo(() => {
    if (!services) return new Map();
    return getServicePositions(services);
  }, [services]);

  // Derive unique service-to-service connections from parent/child span relationships
  const connections = useMemo(() => {
    if (!spans) return [];

    const spanIdToServiceId = new Map<string, number>();
    for (const span of spans) {
      spanIdToServiceId.set(span.spanId, span.serviceId);
    }

    const seen = new Set<string>();
    const links: [number, number][] = [];

    for (const span of spans) {
      if (!span.parentSpanId) continue;

      const parentServiceId = spanIdToServiceId.get(span.parentSpanId);
      if (!parentServiceId || parentServiceId === span.serviceId) continue;

      // Avoid duplicate lines for the same pair, regardless of direction
      const key = [parentServiceId, span.serviceId].sort().join("-");
      if (seen.has(key)) continue;
      seen.add(key);

      links.push([parentServiceId, span.serviceId]);
    }

    return links;
  }, [spans]);

  if (servicesLoading || spansLoading || !services) return null;

  return (
    <>
      {services.map((service) => {
        const position = positions.get(service.id);
        if (!position) return null;
        return <ServiceNode key={service.id} position={position} name={service.name} />;
      })}

      {connections.map(([fromId, toId]) => {
        const fromPos = positions.get(fromId);
        const toPos = positions.get(toId);
        if (!fromPos || !toPos) return null;

        return (
          <Line
            key={`${fromId}-${toId}`}
            points={[fromPos, toPos]}
            color="#888888"
            lineWidth={1}
          />
        );
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