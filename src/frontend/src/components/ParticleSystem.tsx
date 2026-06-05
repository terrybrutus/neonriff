import { useGameStore } from "@/store/gameStore";
import type { ParticleEmit } from "@/types/game";
import { useEffect, useMemo, useRef } from "react";

const LANE_COLORS = [
  "#00ff41", // green
  "#ff0033", // red
  "#ffee00", // yellow
  "#00aaff", // blue
  "#ff6600", // orange
];

const PARTICLE_COUNT: Record<string, number> = {
  explosion: 12,
  hit: 10,
  miss: 4,
};

const PARTICLE_SIZE: Record<string, number> = {
  explosion: 7,
  hit: 5,
  miss: 4,
};

interface Particle {
  id: string;
  angle: number;
  speed: number;
  size: number;
  delay: number;
}

function generateParticles(type: ParticleEmit["type"]): Particle[] {
  const count = PARTICLE_COUNT[type] ?? 8;
  const baseSize = PARTICLE_SIZE[type] ?? 5;
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: `${type}-${i}`,
      angle: Math.random() * 360,
      speed: 0.5 + Math.random() * 1.5,
      size: baseSize + (Math.random() * baseSize * 0.5 - baseSize * 0.25),
      delay: Math.random() * 80,
    });
  }
  return particles;
}

function ParticleBurst({
  particle,
  color,
  type,
}: {
  particle: ParticleEmit;
  color: string;
  type: ParticleEmit["type"];
}) {
  const particles = useMemo(() => generateParticles(type), [type]);
  const clearParticle = useGameStore((s) => s.clearParticle);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      clearParticle(particle.id);
    }, 650);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [particle.id, clearParticle]);

  const laneX = (particle.lane + 0.5) * (100 / 5);
  const hitZoneY = 85; // vh

  const isMiss = type === "miss";
  const isExplosion = type === "explosion";

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: `${laneX}vw`,
        top: `${hitZoneY}vh`,
        zIndex: 100,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Flash ring for perfect hits */}
      {isExplosion && (
        <div
          className="absolute rounded-full"
          style={{
            width: 20,
            height: 20,
            left: -10,
            top: -10,
            backgroundColor: color,
            animation: "flash-ring 600ms ease-out forwards",
            boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
          }}
        />
      )}

      {/* Miss red flash on lane */}
      {isMiss && (
        <div
          className="absolute rounded-full"
          style={{
            width: 60,
            height: 60,
            left: -30,
            top: -30,
            backgroundColor: "rgba(255,0,51,0.3)",
            animation: "miss-flash 400ms ease-out forwards",
          }}
        />
      )}

      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const dist = p.speed * 80; // px distance
        const tx = Math.cos(rad) * dist;
        const ty = isMiss
          ? Math.abs(Math.sin(rad)) * dist + 30
          : Math.sin(rad) * dist;

        return (
          <span
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: -p.size / 2,
              top: -p.size / 2,
              backgroundColor: isMiss ? "#ff0033" : color,
              boxShadow: isMiss
                ? "0 0 6px #ff0033"
                : `0 0 8px ${color}, 0 0 14px ${color}`,
              animation: `particle-fly 600ms ease-out ${p.delay}ms forwards`,
              opacity: 0,
              // CSS custom properties for the keyframe
              // @ts-expect-error custom property
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
            }}
          />
        );
      })}
    </div>
  );
}

export function ParticleSystem() {
  const particles = useGameStore((s) => s.particles);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }}>
      {particles.map((p) => (
        <ParticleBurst
          key={p.id}
          particle={p}
          color={LANE_COLORS[p.lane] ?? "#ffffff"}
          type={p.type}
        />
      ))}
    </div>
  );
}
