import { audioEngine } from "@/lib/audioEngine";
import { useGameStore } from "@/store/gameStore";
import { LANE_COLORS } from "@/types/game";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
const LANE_X = [-2, -1, 0, 1, 2] as const;
const LANE_W = 0.86;
const HIT_Z = 7.5;
const HIGHWAY_SPEED = 20; // units per second — time window = 4s → 80 units visible
const NOTE_W = 0.78;
const NOTE_H = 0.28;
const NOTE_D = 0.52;
const SPAWN_WINDOW = 4.2; // seconds ahead to spawn notes
const DESPAWN_WINDOW = 0.5; // seconds past hit zone before removal

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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -17]}>
        <planeGeometry args={[5, 70]} />
        <meshStandardMaterial color="#0d0d1a" metalness={0.8} roughness={0.3} />
      </mesh>

      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`div-${i}`}
          position={[LANE_X[i] - LANE_W / 2 - 0.02, 0.01, -17]}
        >
          <boxGeometry args={[0.03, 0.01, 70]} />
          <meshStandardMaterial
            color="#1a1a3a"
            emissive="#2244aa"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
      <mesh position={[LANE_X[4] + LANE_W / 2 + 0.02, 0.01, -17]}>
        <boxGeometry args={[0.03, 0.01, 70]} />
        <meshStandardMaterial
          color="#1a1a3a"
          emissive="#2244aa"
          emissiveIntensity={0.4}
        />
      </mesh>

      {LANE_X.map((x, i) => (
        <mesh
          key={`glow-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.001, -17]}
        >
          <planeGeometry args={[LANE_W * 0.6, 70]} />
          <meshBasicMaterial
            color={laneColorObjs[i]}
            transparent
            opacity={0.04}
            depthWrite={false}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.02, HIT_Z - 0.2]}>
        <boxGeometry args={[5, 0.04, 0.06]} />
        <meshStandardMaterial
          emissive="#ffffff"
          emissiveIntensity={1.5}
          color="#ffffff"
        />
      </mesh>
    </group>
  );
}

// -----------------------------------------------------------------------
// Hit zone fret buttons
// -----------------------------------------------------------------------
function HitZone({ pressedLanes }: { pressedLanes: boolean[] }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    meshRefs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      const pressed = pressedLanes[i];
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
      mat.emissiveIntensity = pressed ? 3.5 : 0.4 + pulse * 0.2;
      m.scale.setScalar(pressed ? 1.15 : 1.0);
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
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <cylinderGeometry args={[0.28, 0.28, 0.06, 20]} />
            <meshStandardMaterial
              color="#050510"
              metalness={0.9}
              roughness={0.15}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -----------------------------------------------------------------------
// Note gems — imperative management, time-window only, NO PointLights
// -----------------------------------------------------------------------
interface NoteEntry {
  mesh: THREE.Mesh;
  halo: THREE.Sprite;
  lane: number;
  hitTime: number;
  opacity: number;
  hit: boolean;
  missed: boolean;
}

function Notes() {
  const notes = useGameStore((s) => s.notes);
  const groupRef = useRef<THREE.Group>(null);

  // Refs so useFrame always has fresh data
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const entriesRef = useRef<Map<string, NoteEntry>>(new Map());

  // Shared geometry — one per component lifetime
  const noteGeo = useMemo(
    () => new THREE.BoxGeometry(NOTE_W, NOTE_H, NOTE_D),
    [],
  );
  const noteMats = useMemo(
    () =>
      laneColorHex.map(
        (hex) =>
          new THREE.MeshStandardMaterial({
            color: hex,
            emissive: hex,
            emissiveIntensity: 1.8,
            metalness: 0.5,
            roughness: 0.25,
            transparent: true,
            opacity: 1,
          }),
      ),
    [],
  );
  const haloMats = useMemo(
    () =>
      laneColorHex.map(
        (hex) =>
          new THREE.SpriteMaterial({
            color: hex,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const now = audioEngine.getSongTime();
    const currentNotes = notesRef.current;

    for (const note of currentNotes) {
      const timeUntilHit = note.time - now;
      const inWindow =
        timeUntilHit < SPAWN_WINDOW && timeUntilHit > -DESPAWN_WINDOW;
      const entry = entriesRef.current.get(note.id);

      // Spawn if in window and not tracked yet
      if (inWindow && !note.hit && !note.missed && !entry) {
        const lane = note.lane;
        const mesh = new THREE.Mesh(noteGeo, noteMats[lane].clone());
        const halo = new THREE.Sprite(haloMats[lane].clone());
        halo.scale.set(1.6, 0.9, 1);
        mesh.add(halo);
        mesh.position.set(
          LANE_X[lane],
          NOTE_H / 2 + 0.02,
          HIT_Z + timeUntilHit * HIGHWAY_SPEED,
        );
        group.add(mesh);
        entriesRef.current.set(note.id, {
          mesh,
          halo,
          lane,
          hitTime: note.time,
          opacity: 1,
          hit: false,
          missed: false,
        });
      }

      if (!entry) continue;

      // Sync hit/missed from store
      if (note.hit && !entry.hit) entry.hit = true;
      if (note.missed && !entry.missed) entry.missed = true;

      // Update position
      const zPos = HIT_Z + (entry.hitTime - now) * HIGHWAY_SPEED;
      entry.mesh.position.z = zPos;

      // Fade out on hit (burst effect)
      if (entry.hit) {
        entry.opacity -= 0.18;
        const mat = entry.mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, entry.opacity);
        mat.emissiveIntensity = 4 * entry.opacity;
        entry.mesh.scale.setScalar(1 + (1 - entry.opacity) * 2);
        if (entry.opacity <= 0) {
          group.remove(entry.mesh);
          entriesRef.current.delete(note.id);
        }
        continue;
      }

      // Remove if missed or past hit zone
      if (entry.missed || !inWindow) {
        entry.opacity -= 0.12;
        const mat = entry.mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, entry.opacity);
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
// Stage background
// -----------------------------------------------------------------------
function StageBackground() {
  const spotRef1 = useRef<THREE.SpotLight>(null);
  const spotRef2 = useRef<THREE.SpotLight>(null);
  const spotRef3 = useRef<THREE.SpotLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (spotRef1.current) {
      spotRef1.current.position.x = Math.sin(t * 0.7) * 5;
      spotRef1.current.intensity = 3 + Math.sin(t * 1.3) * 1.5;
    }
    if (spotRef2.current) {
      spotRef2.current.position.x = Math.cos(t * 0.5) * 6;
      spotRef2.current.intensity = 2.5 + Math.cos(t * 0.9) * 1;
    }
    if (spotRef3.current) {
      spotRef3.current.position.x = Math.sin(t * 1.1 + 2) * 4;
      spotRef3.current.intensity = 2 + Math.sin(t * 1.7 + 1) * 1.2;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -50]}>
        <planeGeometry args={[30, 80]} />
        <meshStandardMaterial color="#06060f" metalness={0.2} roughness={0.9} />
      </mesh>

      <mesh position={[0, 8, -52]}>
        <planeGeometry args={[22, 14]} />
        <meshStandardMaterial
          color="#0a0020"
          emissive="#1a0050"
          emissiveIntensity={0.8}
        />
      </mesh>

      <mesh position={[0, 10, -51]}>
        <planeGeometry args={[14, 3]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#cc00ff"
          emissiveIntensity={2.5}
          transparent
          opacity={0.9}
        />
      </mesh>

      {[-6, 6].map((x, side) => (
        <group key={`spk-${side}`} position={[x, 0, -20]}>
          {[0, 1.5, 3].map((dy, j) => (
            <mesh key={j} position={[0, dy, 0]}>
              <boxGeometry args={[2.2, 1.3, 1.2]} />
              <meshStandardMaterial
                color="#0a0a0a"
                metalness={0.7}
                roughness={0.4}
              />
            </mesh>
          ))}
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[2.3, 4.6, 0.05]} />
            <meshStandardMaterial
              color="#000000"
              emissive={side === 0 ? "#ff0066" : "#0066ff"}
              emissiveIntensity={1.5}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      ))}

      {Array.from({ length: 24 }, (_, i) => {
        const x = (i - 12) * 2.0 + Math.sin(i * 2.3) * 0.5;
        const z = -38 - Math.abs(Math.sin(i * 1.7)) * 8;
        const h = 1.8 + Math.sin(i * 3.7) * 0.4;
        return (
          <mesh key={`crowd-${i}`} position={[x, h / 2, z]}>
            <boxGeometry args={[0.7, h, 0.2]} />
            <meshStandardMaterial
              color="#0a0a18"
              emissive="#222244"
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}

      <spotLight
        ref={spotRef1}
        position={[0, 14, -25]}
        angle={0.35}
        penumbra={0.4}
        intensity={3}
        color="#ff00cc"
        castShadow={false}
      />
      <spotLight
        ref={spotRef2}
        position={[0, 14, -28]}
        angle={0.3}
        penumbra={0.5}
        intensity={2.5}
        color="#00ccff"
        castShadow={false}
      />
      <spotLight
        ref={spotRef3}
        position={[0, 13, -22]}
        angle={0.4}
        penumbra={0.3}
        intensity={2}
        color="#ffcc00"
        castShadow={false}
      />

      {[-2.5, -1.25, 0, 1.25, 2.5].map((x, i) => (
        <mesh
          key={`laser-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.005, -30]}
        >
          <planeGeometry args={[0.03, 40]} />
          <meshBasicMaterial
            color={laneColorObjs[i]}
            transparent
            opacity={0.15}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// -----------------------------------------------------------------------
// Particle burst on hit
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

      const count = ev.rating === "perfect" ? 28 : 18;
      const positions = new Float32Array(count * 3);
      const vels: number[] = [];
      for (let i = 0; i < count; i++) {
        positions[i * 3] = LANE_X[ev.lane];
        positions[i * 3 + 1] = 0.3;
        positions[i * 3 + 2] = HIT_Z;
        const angle = (i / count) * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2.5;
        vels.push(
          Math.cos(angle) * speed,
          (0.5 + Math.random()) * 3,
          Math.sin(angle) * speed * 0.3,
        );
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: laneColorHex[ev.lane],
        size: 0.12,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const pts = new THREE.Points(geo, mat) as THREE.Points & PtsMeta;
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
      if (age > 0.8) {
        group.remove(pts);
        ptsMeshes.current.delete(id);
        continue;
      }
      const mat = pts.material as THREE.PointsMaterial;
      mat.opacity = 1 - age / 0.8;
      const pos = (pts.geometry.attributes.position as THREE.BufferAttribute)
        .array as Float32Array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += pts.vels[i * 3] * delta;
        pos[i * 3 + 1] += pts.vels[i * 3 + 1] * delta - 4 * delta * age;
        pos[i * 3 + 2] += pts.vels[i * 3 + 2] * delta;
      }
      (pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate =
        true;
    }
  });

  return <group ref={groupRef} />;
}

// -----------------------------------------------------------------------
// Camera shake on miss
// -----------------------------------------------------------------------
function CameraRig() {
  const lastRating = useGameStore((s) => s.lastRating);
  const { camera } = useThree();
  const shakeRef = useRef({ active: false, t: 0 });

  useEffect(() => {
    if (lastRating === "miss") shakeRef.current = { active: true, t: 0 };
  }, [lastRating]);

  useFrame((_, delta) => {
    const s = shakeRef.current;
    if (!s.active) return;
    s.t += delta;
    const decay = Math.max(0, 1 - s.t / 0.35);
    camera.position.x = Math.sin(s.t * 60) * 0.1 * decay;
    camera.position.y = 5.5 + Math.cos(s.t * 45) * 0.1 * decay;
    if (decay === 0) {
      s.active = false;
      camera.position.x = 0;
      camera.position.y = 5.5;
    }
  });

  return null;
}

// -----------------------------------------------------------------------
// Beat pulse
// -----------------------------------------------------------------------
function BeatPulse({ bpm }: { bpm: number }) {
  const beatDur = 60 / bpm;
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const phase = (t % beatDur) / beatDur;
    const pulse = phase < 0.12 ? 1 - phase / 0.12 : 0;
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
        pulse * 0.07;
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.003, HIT_Z - 5]}
    >
      <planeGeometry args={[5, 10]} />
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
// Exported component
// -----------------------------------------------------------------------
interface Highway3DProps {
  pressedLanes: boolean[];
  bpm: number;
}

export function Highway3D({ pressedLanes, bpm }: Highway3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 5.5, 12], fov: 62, near: 0.1, far: 150 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: "100%", height: "100%", background: "#000008" }}
      dpr={[1, 2]}
    >
      <fog attach="fog" args={["#000012", 25, 65]} />
      <color attach="background" args={["#000008"]} />

      <ambientLight intensity={0.08} />
      <directionalLight position={[0, 10, 5]} intensity={0.4} color="#334466" />

      {/* Per-lane lights at hit zone — only 5, within WebGL limit */}
      {LANE_X.map((x, i) => (
        <pointLight
          key={`ll-${i}`}
          position={[x, 1.5, HIT_Z - 0.5]}
          intensity={pressedLanes[i] ? 3 : 0.5}
          distance={4}
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
    </Canvas>
  );
}
