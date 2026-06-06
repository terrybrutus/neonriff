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
const SPAWN_Z = -42;
const HIGHWAY_SPEED = 20; // units per second
const NOTE_W = 0.78;
const NOTE_H = 0.28;
const NOTE_D = 0.52;

const laneColorObjs = LANE_X.map(
  (_, i) => new THREE.Color(LANE_COLORS[i as 0]),
);
const laneColorHex = [
  0x00ff41, 0xff1744, 0xffea00, 0x00b0ff, 0xff6d00,
] as const;

// -----------------------------------------------------------------------
// Highway plane
// -----------------------------------------------------------------------
function Highway() {
  return (
    <group>
      {/* Main highway floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -17]}>
        <planeGeometry args={[5, 70]} />
        <meshStandardMaterial
          color="#0d0d1a"
          metalness={0.8}
          roughness={0.3}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* Lane dividers */}
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
      {/* Right edge */}
      <mesh position={[LANE_X[4] + LANE_W / 2 + 0.02, 0.01, -17]}>
        <boxGeometry args={[0.03, 0.01, 70]} />
        <meshStandardMaterial
          color="#1a1a3a"
          emissive="#2244aa"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Lane glow strips — one subtle colored strip per lane */}
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

      {/* Hit zone line */}
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
// Hit zone buttons (fret pads)
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
      const s = pressed ? 1.15 : 1.0;
      m.scale.setScalar(s);
    });
  });

  return (
    <group>
      {LANE_X.map((x, i) => (
        <group key={`btn-${i}`} position={[x, 0, HIT_Z]}>
          {/* Outer ring */}
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
          {/* Inner pad */}
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
// Note gems
// -----------------------------------------------------------------------
interface ActiveNote {
  id: string;
  lane: number;
  spawnZ: number;
  hitTime: number;
  hit: boolean;
  missed: boolean;
  opacity: number;
}

function Notes() {
  const notes = useGameStore((s) => s.notes);
  const meshGroupRef = useRef<THREE.Group>(null);
  const activeRef = useRef<Map<string, { mesh: THREE.Mesh; data: ActiveNote }>>(
    new Map(),
  );

  // Build geometry + material templates once
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
            metalness: 0.6,
            roughness: 0.2,
            transparent: true,
            opacity: 1,
          }),
      ),
    [],
  );

  // Halo sprite material (additive glow)
  const haloMats = useMemo(
    () =>
      laneColorHex.map(
        (hex) =>
          new THREE.SpriteMaterial({
            color: hex,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  );

  useEffect(() => {
    if (!meshGroupRef.current) return;
    const group = meshGroupRef.current;

    // Spawn new notes
    for (const note of notes) {
      if (note.hit || note.missed) continue;
      if (activeRef.current.has(note.id)) continue;

      const lane = note.lane;
      const mesh = new THREE.Mesh(noteGeo, noteMats[lane].clone());
      mesh.position.set(LANE_X[lane], NOTE_H / 2 + 0.02, SPAWN_Z);

      // Halo sprite
      const halo = new THREE.Sprite(haloMats[lane].clone());
      halo.scale.set(1.4, 0.8, 1);
      mesh.add(halo);

      // Point light for local glow
      const light = new THREE.PointLight(laneColorHex[lane], 0.8, 2.5);
      mesh.add(light);

      group.add(mesh);
      activeRef.current.set(note.id, {
        mesh,
        data: {
          id: note.id,
          lane,
          spawnZ: SPAWN_Z,
          hitTime: note.time,
          hit: note.hit,
          missed: note.missed,
          opacity: 1,
        },
      });
    }
  }, [notes, noteGeo, noteMats, haloMats]);

  useFrame(() => {
    if (!meshGroupRef.current) return;
    const now = audioEngine.getSongTime();
    const group = meshGroupRef.current;

    for (const [id, entry] of activeRef.current) {
      const { mesh, data } = entry;

      // Calculate current Z position based on song time
      // When now == hitTime, note should be at HIT_Z
      const timeUntilHit = data.hitTime - now;
      const zPos = HIT_Z + timeUntilHit * HIGHWAY_SPEED;
      mesh.position.z = zPos;

      // Update hit/missed state from store
      const storeNote = notes.find((n) => n.id === id);
      if (storeNote) {
        data.hit = storeNote.hit;
        data.missed = storeNote.missed;
      }

      if (data.hit) {
        // Flash then remove
        data.opacity -= 0.2;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, data.opacity);
        mat.emissiveIntensity = 5 * data.opacity;
        mesh.scale.setScalar(1 + (1 - data.opacity) * 1.5);
        if (data.opacity <= 0) {
          group.remove(mesh);
          activeRef.current.delete(id);
        }
      } else if (data.missed || zPos > HIT_Z + 3) {
        // Note passed — fade and remove
        data.opacity -= 0.15;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, data.opacity);
        if (data.opacity <= 0) {
          group.remove(mesh);
          activeRef.current.delete(id);
        }
      }
    }
  });

  return <group ref={meshGroupRef} />;
}

// -----------------------------------------------------------------------
// Stage background — speakers, crowd, sky, spotlights
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
      {/* Stage floor extension behind hit zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -50]}>
        <planeGeometry args={[30, 80]} />
        <meshStandardMaterial color="#06060f" metalness={0.2} roughness={0.9} />
      </mesh>

      {/* Back wall / LED screen */}
      <mesh position={[0, 8, -52]}>
        <planeGeometry args={[22, 14]} />
        <meshStandardMaterial
          color="#0a0020"
          emissive="#1a0050"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Neon band logo text (billboard geometry) */}
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

      {/* Speaker stacks — left and right */}
      {[-6, 6].map((x, side) => (
        <group key={`speakers-${side}`} position={[x, 0, -20]}>
          {/* Stack of 3 speaker boxes */}
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
          {/* Speaker cone details */}
          {[0, 1.5, 3].map((dy, j) => (
            <mesh
              key={`cone-${j}`}
              position={[0, dy, 0.61]}
              rotation={[0, 0, 0]}
            >
              <circleGeometry args={[0.42, 16]} />
              <meshStandardMaterial
                color="#1a1a1a"
                metalness={0.5}
                roughness={0.6}
              />
            </mesh>
          ))}
          {/* Neon trim on speaker stack */}
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

      {/* Crowd silhouettes */}
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

      {/* Stage lighting rigs */}
      {[-4, 0, 4].map((x, i) => (
        <mesh key={`rig-${i}`} position={[x, 13, -30]}>
          <boxGeometry args={[1.2, 0.2, 0.2]} />
          <meshStandardMaterial
            color="#111111"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Animated spotlights */}
      <spotLight
        ref={spotRef1}
        position={[0, 14, -25]}
        target-position={[0, 0, -20]}
        angle={0.35}
        penumbra={0.4}
        intensity={3}
        color="#ff00cc"
        castShadow={false}
      />
      <spotLight
        ref={spotRef2}
        position={[0, 14, -28]}
        target-position={[1, 0, -15]}
        angle={0.3}
        penumbra={0.5}
        intensity={2.5}
        color="#00ccff"
        castShadow={false}
      />
      <spotLight
        ref={spotRef3}
        position={[0, 13, -22]}
        target-position={[-1, 0, -18]}
        angle={0.4}
        penumbra={0.3}
        intensity={2}
        color="#ffcc00"
        castShadow={false}
      />

      {/* Floor laser strips */}
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
// Hit particles (burst on perfect/great)
// -----------------------------------------------------------------------
function Particles() {
  const hitEvents = useGameStore((s) => s.hitEvents);
  const clearHitEvent = useGameStore((s) => s.clearHitEvent);
  const meshGroupRef = useRef<THREE.Group>(null);
  const particleMeshes = useRef<Map<string, THREE.Points>>(new Map());

  useEffect(() => {
    for (const ev of hitEvents) {
      if (particleMeshes.current.has(ev.id)) continue;
      if (ev.rating === "miss") continue;

      const count = ev.rating === "perfect" ? 32 : 20;
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

      const pts = new THREE.Points(geo, mat);
      (
        pts as unknown as { _vels: number[]; _birth: number; _evId: string }
      )._vels = vels;
      (
        pts as unknown as { _vels: number[]; _birth: number; _evId: string }
      )._birth = performance.now() / 1000;
      (
        pts as unknown as { _vels: number[]; _birth: number; _evId: string }
      )._evId = ev.id;

      meshGroupRef.current?.add(pts);
      particleMeshes.current.set(ev.id, pts);
      clearHitEvent(ev.id);
    }
  }, [hitEvents, clearHitEvent]);

  useFrame((_, delta) => {
    for (const [id, pts] of particleMeshes.current) {
      const p = pts as unknown as {
        _vels: number[];
        _birth: number;
        _evId: string;
      };
      const age = performance.now() / 1000 - p._birth;
      const mat = pts.material as THREE.PointsMaterial;

      if (age > 0.8) {
        meshGroupRef.current?.remove(pts);
        particleMeshes.current.delete(id);
        continue;
      }

      mat.opacity = 1 - age / 0.8;
      const pos = (pts.geometry.attributes.position as THREE.BufferAttribute)
        .array as Float32Array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += p._vels[i * 3] * delta;
        pos[i * 3 + 1] += p._vels[i * 3 + 1] * delta - 4 * delta * age;
        pos[i * 3 + 2] += p._vels[i * 3 + 2] * delta;
      }
      (pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate =
        true;
    }
  });

  return <group ref={meshGroupRef} />;
}

// -----------------------------------------------------------------------
// Camera shake on miss
// -----------------------------------------------------------------------
function CameraRig() {
  const lastRating = useGameStore((s) => s.lastRating);
  const { camera } = useThree();
  const shakeRef = useRef({ active: false, intensity: 0, t: 0 });

  useEffect(() => {
    if (lastRating === "miss") {
      shakeRef.current = { active: true, intensity: 0.12, t: 0 };
    }
  }, [lastRating]);

  useFrame((_, delta) => {
    const s = shakeRef.current;
    if (s.active) {
      s.t += delta;
      const decay = Math.max(0, 1 - s.t / 0.4);
      camera.position.x = Math.sin(s.t * 60) * s.intensity * decay;
      camera.position.y = 5.5 + Math.cos(s.t * 45 + 1) * s.intensity * decay;
      if (decay === 0) {
        s.active = false;
        camera.position.x = 0;
        camera.position.y = 5.5;
      }
    }
  });

  return null;
}

// -----------------------------------------------------------------------
// Beat pulse effect — syncs visuals to BPM
// -----------------------------------------------------------------------
function BeatPulse({ bpm }: { bpm: number }) {
  const beatDur = 60 / bpm;
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const phase = (t % beatDur) / beatDur;
    const pulse = phase < 0.1 ? 1 - phase / 0.1 : 0;
    if (pulseRef.current) {
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = pulse * 0.08;
    }
  });

  return (
    <mesh
      ref={pulseRef}
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
// Main exported component
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
      dpr={Math.min(window.devicePixelRatio, 2)}
    >
      {/* Atmosphere */}
      <fog attach="fog" color="#000012" near={25} far={65} />
      <color attach="background" args={["#000008"]} />

      {/* Lighting */}
      <ambientLight intensity={0.06} />
      <directionalLight position={[0, 10, 5]} intensity={0.4} color="#334466" />
      {/* Per-lane colored lights over hit zone */}
      {LANE_X.map((x, i) => (
        <pointLight
          key={`lane-light-${i}`}
          position={[x, 1.5, HIT_Z - 0.5]}
          intensity={pressedLanes[i] ? 3 : 0.6}
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
