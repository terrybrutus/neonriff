import { audioEngine } from "@/lib/audioEngine";
import { useGameStore } from "@/store/gameStore";
import type { Note } from "@/types/game";
import { LANE_COLORS } from "@/types/game";
import { Sparkles, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
const LANE_X = [-2, -1, 0, 1, 2] as const;
const LANE_W = 0.86;
const HIT_Z = 7.5;
const HIGHWAY_SPEED = 22; // units per second
const NOTE_R = 0.32; // octahedron radius
const SPAWN_WINDOW = 4.0; // seconds ahead to spawn
const DESPAWN_WINDOW = 0.5; // seconds past hit zone before removal
const NOTE_POOL_SIZE = 20; // pre-allocated materials per lane

const laneColorObjs = [0, 1, 2, 3, 4].map(
  (i) => new THREE.Color(LANE_COLORS[i as 0]),
);
const laneColorHex = [
  0x00ff41, 0xff1744, 0xffea00, 0x00b0ff, 0xff6d00,
] as const;

// -----------------------------------------------------------------------
// Highway floor + lane dividers + glow strips
// -----------------------------------------------------------------------
function Highway() {
  return (
    <group>
      {/* Dark reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -17]}>
        <planeGeometry args={[5, 70]} />
        <meshStandardMaterial
          color="#030310"
          metalness={0.95}
          roughness={0.08}
        />
      </mesh>

      {/* Subtle blue sheen overlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, -17]}>
        <planeGeometry args={[5, 70]} />
        <meshBasicMaterial
          color="#0022ff"
          transparent
          opacity={0.022}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Lane dividers */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`div-${i}`}
          position={[LANE_X[i] - LANE_W / 2 - 0.02, 0.01, -17]}
        >
          <boxGeometry args={[0.022, 0.01, 70]} />
          <meshStandardMaterial
            color="#1a1a3a"
            emissive="#3355aa"
            emissiveIntensity={0.7}
          />
        </mesh>
      ))}
      <mesh position={[LANE_X[4] + LANE_W / 2 + 0.02, 0.01, -17]}>
        <boxGeometry args={[0.022, 0.01, 70]} />
        <meshStandardMaterial
          color="#1a1a3a"
          emissive="#3355aa"
          emissiveIntensity={0.7}
        />
      </mesh>

      {/* Per-lane glow strips */}
      {LANE_X.map((x, i) => (
        <mesh
          key={`glow-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.001, -17]}
        >
          <planeGeometry args={[LANE_W * 0.5, 70]} />
          <meshBasicMaterial
            color={laneColorObjs[i]}
            transparent
            opacity={0.055}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Hit line */}
      <mesh position={[0, 0.02, HIT_Z - 0.2]}>
        <boxGeometry args={[5.1, 0.04, 0.05]} />
        <meshStandardMaterial
          emissive="#ffffff"
          emissiveIntensity={2.5}
          color="#ffffff"
        />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------
// Hit zone fret buttons + press rings
// -----------------------------------------------------------------------
function HitZone({ pressedLanes }: { pressedLanes: boolean[] }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringPhase = useRef<number[]>([0, 0, 0, 0, 0]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    meshRefs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      const pressed = pressedLanes[i];
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
      mat.emissiveIntensity = pressed ? 6 : 0.5 + pulse * 0.35;
      m.scale.setScalar(pressed ? 1.28 : 1.0);
    });
    ringRefs.current.forEach((r, i) => {
      if (!r) return;
      const mat = r.material as THREE.MeshBasicMaterial;
      if (pressedLanes[i]) {
        ringPhase.current[i] = Math.min(ringPhase.current[i] + delta * 6, 1);
      } else {
        ringPhase.current[i] = 0;
      }
      const p = ringPhase.current[i];
      mat.opacity = pressedLanes[i] ? (1 - p) * 0.7 : 0;
      r.scale.setScalar(1 + p * 1.5);
    });
  });

  return (
    <group>
      {LANE_X.map((x, i) => (
        <group key={`btn-${i}`} position={[x, 0, HIT_Z]}>
          <mesh
            ref={(el) => {
              meshRefs.current[i] = el;
            }}
          >
            <torusGeometry args={[0.36, 0.07, 8, 24]} />
            <meshStandardMaterial
              color={`#${laneColorHex[i].toString(16).padStart(6, "0")}`}
              emissive={`#${laneColorHex[i].toString(16).padStart(6, "0")}`}
              emissiveIntensity={0.6}
              metalness={0.85}
              roughness={0.12}
            />
          </mesh>
          {/* Expanding press ring */}
          <mesh
            ref={(el) => {
              ringRefs.current[i] = el;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.01, 0]}
          >
            <ringGeometry args={[0.36, 0.56, 24]} />
            <meshBasicMaterial
              color={`#${laneColorHex[i].toString(16).padStart(6, "0")}`}
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <cylinderGeometry args={[0.28, 0.28, 0.06, 20]} />
            <meshStandardMaterial
              color="#050510"
              metalness={0.95}
              roughness={0.08}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -----------------------------------------------------------------------
// Note gems — OctahedronGeometry diamonds that rotate as they fly in
// -----------------------------------------------------------------------
interface NoteEntry {
  mesh: THREE.Mesh;
  trail: THREE.Mesh;
  halo1: THREE.Sprite;
  halo2: THREE.Sprite;
  lane: number;
  hitTime: number;
  opacity: number;
  hit: boolean;
  missed: boolean;
}

function Notes() {
  const groupRef = useRef<THREE.Group>(null);
  const notesRef = useRef<Note[]>([]);
  const entriesRef = useRef<Map<string, NoteEntry>>(new Map());

  // Subscribe without causing React re-renders — critical for performance
  useEffect(() => {
    notesRef.current = useGameStore.getState().notes;
    return useGameStore.subscribe((s) => {
      notesRef.current = s.notes;
    });
  }, []);

  const noteGeo = useMemo(() => new THREE.OctahedronGeometry(NOTE_R, 0), []);
  const trailGeo = useMemo(
    () => new THREE.BoxGeometry(NOTE_R * 0.45, NOTE_R * 0.35, 3.5),
    [],
  );

  // Pre-allocated material pools — no clone() inside useFrame
  const noteMats = useMemo(
    () =>
      laneColorHex.map((hex) =>
        Array.from(
          { length: NOTE_POOL_SIZE },
          () =>
            new THREE.MeshStandardMaterial({
              color: hex,
              emissive: hex,
              emissiveIntensity: 2.8,
              metalness: 0.65,
              roughness: 0.12,
              transparent: true,
              opacity: 1,
            }),
        ),
      ),
    [],
  );

  const trailMats = useMemo(
    () =>
      laneColorHex.map(
        (hex) =>
          new THREE.MeshBasicMaterial({
            color: hex,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  );

  const haloMats1 = useMemo(
    () =>
      laneColorHex.map((hex) =>
        Array.from(
          { length: NOTE_POOL_SIZE },
          () =>
            new THREE.SpriteMaterial({
              color: hex,
              transparent: true,
              opacity: 0.5,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
        ),
      ),
    [],
  );

  const haloMats2 = useMemo(
    () =>
      laneColorHex.map((hex) =>
        Array.from(
          { length: NOTE_POOL_SIZE },
          () =>
            new THREE.SpriteMaterial({
              color: hex,
              transparent: true,
              opacity: 0.14,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
        ),
      ),
    [],
  );

  const poolIdx = useRef<number[]>([0, 0, 0, 0, 0]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const now = audioEngine.getSongTime();
    const currentNotes = notesRef.current;

    for (const note of currentNotes) {
      const timeUntilHit = note.time - now;
      const inWindow =
        timeUntilHit < SPAWN_WINDOW && timeUntilHit > -DESPAWN_WINDOW;
      const entry = entriesRef.current.get(note.id);

      // Spawn new note gem from pool
      if (inWindow && !note.hit && !note.missed && !entry) {
        const lane = note.lane;
        const idx = poolIdx.current[lane];
        poolIdx.current[lane] = (idx + 1) % NOTE_POOL_SIZE;

        const mat = noteMats[lane][idx];
        mat.opacity = 1;
        mat.emissiveIntensity = 2.8;

        const h1 = haloMats1[lane][idx];
        h1.opacity = 0.5;
        const h2 = haloMats2[lane][idx];
        h2.opacity = 0.14;

        const mesh = new THREE.Mesh(noteGeo, mat);

        // Trail extends BEHIND note direction of travel (+Z = toward camera)
        const trail = new THREE.Mesh(trailGeo, trailMats[lane]);
        trail.position.z = 1.75;
        mesh.add(trail);

        const halo1 = new THREE.Sprite(h1);
        halo1.scale.set(1.5, 1.5, 1);
        mesh.add(halo1);

        const halo2 = new THREE.Sprite(h2);
        halo2.scale.set(3.8, 3.8, 1);
        mesh.add(halo2);

        // Notes approach from -Z (into the scene) toward HIT_Z
        const spawnZ = HIT_Z - timeUntilHit * HIGHWAY_SPEED;
        mesh.position.set(LANE_X[lane], NOTE_R + 0.02, spawnZ);
        group.add(mesh);

        entriesRef.current.set(note.id, {
          mesh,
          trail,
          halo1,
          halo2,
          lane,
          hitTime: note.time,
          opacity: 1,
          hit: false,
          missed: false,
        });
      }

      if (!entry) continue;

      if (note.hit && !entry.hit) entry.hit = true;
      if (note.missed && !entry.missed) entry.missed = true;

      // Correct direction: notes come from -Z and reach HIT_Z at hit time
      const zPos = HIT_Z - (entry.hitTime - now) * HIGHWAY_SPEED;
      entry.mesh.position.z = zPos;

      // Spin the gem as it flies in
      entry.mesh.rotation.z += delta * 1.8;
      entry.mesh.rotation.x += delta * 1.2;

      if (entry.hit) {
        entry.opacity -= 0.14;
        const mat = entry.mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, entry.opacity);
        mat.emissiveIntensity = 7 * entry.opacity;
        entry.mesh.scale.setScalar(1 + (1 - entry.opacity) * 3.5);
        if (entry.opacity <= 0) {
          group.remove(entry.mesh);
          entriesRef.current.delete(note.id);
        }
        continue;
      }

      if (entry.missed || !inWindow) {
        entry.opacity -= 0.1;
        const mat = entry.mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, entry.opacity);
        const h1 = entry.halo1.material as THREE.SpriteMaterial;
        h1.opacity = Math.max(0, entry.opacity * 0.5);
        if (entry.opacity <= 0) {
          group.remove(entry.mesh);
          entriesRef.current.delete(note.id);
        }
      }
    }
  });

  return <group ref={groupRef} />;
}

// -----------------------------------------------------------------------
// Stage background — backdrop, crowd, speakers, moving lights
// -----------------------------------------------------------------------
function StageBackground() {
  const spotRef1 = useRef<THREE.SpotLight>(null);
  const spotRef2 = useRef<THREE.SpotLight>(null);
  const spotRef3 = useRef<THREE.SpotLight>(null);
  const crowdRef = useRef<THREE.Group>(null);

  const crowdData = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        x: (i - 22) * 1.65 + Math.sin(i * 2.3) * 0.5,
        z: -34 - Math.abs(Math.sin(i * 1.7)) * 12,
        h: 1.3 + Math.sin(i * 3.7) * 0.5,
        colorHex: [0xff00cc, 0x00ccff, 0xff6600, 0x00ff88, 0xcc00ff, 0xffcc00][
          i % 6
        ],
        emissiveHex: [
          0xff0088, 0x0088ff, 0xff4400, 0x00ff44, 0xaa00ff, 0xffaa00,
        ][i % 6],
        phase: i * 0.75 + Math.random() * 0.5,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (spotRef1.current) {
      spotRef1.current.position.x = Math.sin(t * 0.7) * 7;
      spotRef1.current.intensity = 5 + Math.sin(t * 1.3) * 2.5;
    }
    if (spotRef2.current) {
      spotRef2.current.position.x = Math.cos(t * 0.5) * 8;
      spotRef2.current.intensity = 3.5 + Math.cos(t * 0.9) * 2;
    }
    if (spotRef3.current) {
      spotRef3.current.position.x = Math.sin(t * 1.1 + 2) * 6;
      spotRef3.current.intensity = 3 + Math.sin(t * 1.7 + 1) * 1.8;
    }
    if (crowdRef.current) {
      crowdRef.current.children.forEach((child, i) => {
        const data = crowdData[i];
        if (data) {
          child.position.y = data.h / 2 + Math.sin(t * 1.5 + data.phase) * 0.2;
        }
      });
    }
  });

  return (
    <group>
      {/* Stage floor extension */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, -55]}>
        <planeGeometry args={[40, 100]} />
        <meshStandardMaterial
          color="#040410"
          metalness={0.3}
          roughness={0.85}
        />
      </mesh>

      {/* Main backdrop screen */}
      <mesh position={[0, 9, -54]}>
        <planeGeometry args={[26, 17]} />
        <meshStandardMaterial
          color="#08001a"
          emissive="#2500aa"
          emissiveIntensity={1.4}
        />
      </mesh>

      {/* Scanline bands across backdrop */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={`scan-${i}`} position={[0, 1.5 + i * 1.6, -53.7]}>
          <planeGeometry args={[26, 0.04]} />
          <meshBasicMaterial
            color="#5500ff"
            transparent
            opacity={0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Top banner */}
      <mesh position={[0, 18, -53]}>
        <planeGeometry args={[26, 2]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#cc00ff"
          emissiveIntensity={3}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Speaker stacks */}
      {([-7, 7] as const).map((x, side) => (
        <group key={`spk-${side}`} position={[x, 0, -24]}>
          {[0, 1.6, 3.2, 4.8].map((dy, j) => (
            <mesh key={j} position={[0, dy, 0]}>
              <boxGeometry args={[2.5, 1.45, 1.4]} />
              <meshStandardMaterial
                color="#0a0a0a"
                metalness={0.85}
                roughness={0.3}
              />
            </mesh>
          ))}
          {/* Speaker cabinet neon glow */}
          <mesh position={[0, 2.3, 0.72]}>
            <boxGeometry args={[2.52, 6.8, 0.04]} />
            <meshBasicMaterial
              color={side === 0 ? "#ff0066" : "#0066ff"}
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Vertical light columns */}
      {([-8, 8] as const).map((x, i) => (
        <mesh key={`col-${i}`} position={[x, 9, -26]}>
          <boxGeometry args={[0.12, 18, 0.12]} />
          <meshStandardMaterial
            color={i === 0 ? "#ff0066" : "#0066ff"}
            emissive={i === 0 ? "#ff0066" : "#0066ff"}
            emissiveIntensity={2.5}
            transparent
            opacity={0.75}
          />
        </mesh>
      ))}

      {/* Animated crowd */}
      <group ref={crowdRef}>
        {crowdData.map((data, i) => (
          <mesh key={`crowd-${i}`} position={[data.x, data.h / 2, data.z]}>
            <boxGeometry args={[0.5, data.h, 0.18]} />
            <meshStandardMaterial
              color={`#${data.colorHex.toString(16).padStart(6, "0")}`}
              emissive={`#${data.emissiveHex.toString(16).padStart(6, "0")}`}
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}
      </group>

      {/* Moving spotlights */}
      <spotLight
        ref={spotRef1}
        position={[0, 18, -28]}
        angle={0.28}
        penumbra={0.55}
        intensity={5}
        color="#ff00cc"
        castShadow={false}
      />
      <spotLight
        ref={spotRef2}
        position={[0, 18, -32]}
        angle={0.24}
        penumbra={0.65}
        intensity={3.5}
        color="#00ccff"
        castShadow={false}
      />
      <spotLight
        ref={spotRef3}
        position={[0, 16, -24]}
        angle={0.32}
        penumbra={0.45}
        intensity={3}
        color="#ffcc00"
        castShadow={false}
      />

      {/* Lane laser lines extending into the distance */}
      {[-2.5, -1.25, 0, 1.25, 2.5].map((x, i) => (
        <mesh
          key={`laser-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.005, -30]}
        >
          <planeGeometry args={[0.022, 44]} />
          <meshBasicMaterial
            color={laneColorObjs[i]}
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// -----------------------------------------------------------------------
// Particle bursts on hit
// -----------------------------------------------------------------------
function Particles() {
  const hitEvents = useGameStore((s) => s.hitEvents);
  const clearHitEvent = useGameStore((s) => s.clearHitEvent);
  const groupRef = useRef<THREE.Group>(null);

  interface PtsMeta {
    vels: number[];
    birth: number;
    evId: string;
  }
  const ptsMeshes = useRef<Map<string, THREE.Points & PtsMeta>>(new Map());

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    for (const ev of hitEvents) {
      if (ptsMeshes.current.has(ev.id)) continue;
      if (ev.rating === "miss") {
        clearHitEvent(ev.id);
        continue;
      }

      const count =
        ev.rating === "perfect" ? 38 : ev.rating === "great" ? 24 : 14;
      const positions = new Float32Array(count * 3);
      const vels: number[] = [];

      for (let i = 0; i < count; i++) {
        positions[i * 3] = LANE_X[ev.lane];
        positions[i * 3 + 1] = 0.3;
        positions[i * 3 + 2] = HIT_Z;
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 1.5 + Math.random() * 3.5;
        vels.push(
          Math.cos(angle) * speed,
          (0.5 + Math.random()) * 4,
          Math.sin(angle) * speed * 0.2,
        );
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: laneColorHex[ev.lane],
        size: ev.rating === "perfect" ? 0.2 : 0.13,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const pts = new THREE.Points(geo, mat) as unknown as THREE.Points & PtsMeta;
      pts.vels = vels;
      pts.birth = performance.now() / 1000;
      pts.evId = ev.id;
      group.add(pts);
      ptsMeshes.current.set(ev.id, pts);
      clearHitEvent(ev.id);
    }
  }, [hitEvents, clearHitEvent]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    for (const [id, pts] of ptsMeshes.current) {
      const age = performance.now() / 1000 - pts.birth;
      if (age > 0.9) {
        group.remove(pts);
        ptsMeshes.current.delete(id);
        continue;
      }
      const mat = pts.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 1 - age / 0.9);
      const pos = (pts.geometry.attributes.position as THREE.BufferAttribute)
        .array as Float32Array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += pts.vels[i * 3] * delta;
        pos[i * 3 + 1] += pts.vels[i * 3 + 1] * delta - 5 * delta * age;
        pos[i * 3 + 2] += pts.vels[i * 3 + 2] * delta;
      }
      (pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate =
        true;
    }
  });

  return <group ref={groupRef} />;
}

// -----------------------------------------------------------------------
// Camera shake — uses Zustand subscribe, no React re-renders
// -----------------------------------------------------------------------
function CameraRig() {
  const { camera } = useThree();
  const shakeRef = useRef({ active: false, t: 0 });

  useEffect(() => {
    return useGameStore.subscribe((state, prev) => {
      if (state.lastRating === "miss" && state.lastRating !== prev.lastRating) {
        shakeRef.current = { active: true, t: 0 };
      }
    });
  }, []);

  useFrame((_, delta) => {
    const s = shakeRef.current;
    if (!s.active) return;
    s.t += delta;
    const decay = Math.max(0, 1 - s.t / 0.35);
    camera.position.x = Math.sin(s.t * 60) * 0.12 * decay;
    camera.position.y = 7 + Math.cos(s.t * 45) * 0.12 * decay;
    if (decay === 0) {
      s.active = false;
      camera.position.x = 0;
      camera.position.y = 7;
    }
  });

  return null;
}

// -----------------------------------------------------------------------
// Beat pulse flash at hit zone
// -----------------------------------------------------------------------
function BeatPulse({ bpm }: { bpm: number }) {
  const beatDur = 60 / bpm;
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const phase = (t % beatDur) / beatDur;
    const pulse = phase < 0.1 ? 1 - phase / 0.1 : 0;
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
        pulse * 0.1;
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.003, HIT_Z - 5]}
    >
      <planeGeometry args={[5.5, 11]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}

// -----------------------------------------------------------------------
// Exported component — memoized so parent health/score re-renders don't
// cascade into the 3D scene. Only re-renders when a lane is pressed or BPM changes.
// -----------------------------------------------------------------------
interface Highway3DProps {
  pressedLanes: boolean[];
  bpm: number;
}

export const Highway3D = memo(
  function Highway3D({ pressedLanes, bpm }: Highway3DProps) {
    return (
      <Canvas
        camera={{ position: [0, 7, 14], fov: 60, near: 0.1, far: 250 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: "100%", height: "100%", background: "#000008" }}
        dpr={[1, 2]}
      >
        <fog attach="fog" args={["#000012", 14, 85]} />
        <color attach="background" args={["#000008"]} />

        <ambientLight intensity={0.06} />
        <directionalLight
          position={[0, 10, 5]}
          intensity={0.3}
          color="#334466"
        />

        {/* Per-lane point lights at hit zone */}
        {LANE_X.map((x, i) => (
          <pointLight
            key={`ll-${i}`}
            position={[x, 1.8, HIT_Z - 0.5]}
            intensity={pressedLanes[i] ? 6 : 0.6}
            distance={5.5}
            color={`#${laneColorHex[i].toString(16).padStart(6, "0")}`}
          />
        ))}

        <CameraRig />
        <BeatPulse bpm={bpm} />
        <Highway />
        <HitZone pressedLanes={pressedLanes} />
        <Notes />
        <StageBackground />
        <Particles />

        {/* Starfield backdrop */}
        <Stars
          radius={200}
          depth={80}
          count={350}
          factor={5}
          saturation={0.5}
          fade
          speed={0.3}
        />

        {/* Ambient stage atmosphere */}
        <Sparkles
          count={55}
          scale={[18, 12, 8]}
          position={[0, 6, -22]}
          size={5}
          speed={0.35}
          opacity={0.28}
          color="#8800ff"
        />
        <Sparkles
          count={35}
          scale={[12, 6, 5]}
          position={[0, 3, -12]}
          size={3}
          speed={0.55}
          opacity={0.22}
          color="#0088ff"
        />
      </Canvas>
    );
  },
  (prev, next) => {
    // Only re-render when BPM or actual lane press state changes
    if (prev.bpm !== next.bpm) return false;
    for (let i = 0; i < 5; i++) {
      if (prev.pressedLanes[i] !== next.pressedLanes[i]) return false;
    }
    return true;
  },
);
