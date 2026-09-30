// VeriCred — cinematic scroll scene: six stations of the credential journey,
// driven imperatively by a single scroll-progress ref supplied by the page.

import { useMemo, useRef } from 'react';
import type { FC, RefObject } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html } from '@react-three/drei';
import { SceneCanvas, usePrefersReducedMotion, seg, damp, clamp } from './scene-utils';

export interface ScrollSceneProps {
  progress: RefObject<number>;
}

type PRef = RefObject<number>;
const at = (progress: PRef) => clamp(progress.current, 0, 1);

const C = {
  deep: '#173B57',
  academic: '#2F6B8A',
  teal: '#4F8582',
  sage: '#7FA396',
  sand: '#C9B99A',
  line: '#C8C6BC',
  card: '#FDFCFA',
  private: '#28504D',
};

const STATION = 6.4; // world spacing between stations
const SPAN = STATION * 5;

const Label: FC<{ y: number; children: string }> = ({ y, children }) => (
  <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
    <div
      className="whitespace-nowrap"
      style={{
        transform: `translateY(${y}px)`,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#6B6B67',
      }}
    >
      {children}
    </div>
  </Html>
);

const Rail: FC = () => (
  <mesh position={[SPAN / 2, -2.5, 0]}>
    <boxGeometry args={[SPAN + STATION, 0.008, 0.008]} />
    <meshBasicMaterial color={C.line} transparent opacity={0.6} />
  </mesh>
);

/* ---------------------------- Station 0: Issue ---------------------------- */

const StationIssue: FC<{ progress: PRef }> = ({ progress }) => {
  const card = useRef<THREE.Group>(null);
  const stamp = useRef<THREE.Mesh>(null);
  const seal = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = at(progress);
    const t = seg(p, 0.02, 0.16);
    if (card.current) {
      card.current.scale.setScalar(0.55 + t * 0.45);
      card.current.rotation.y = (1 - t) * -0.9;
    }
    if (stamp.current) {
      stamp.current.position.z = 1.4 * (1 - seg(p, 0.08, 0.2)) - 0.06;
      stamp.current.scale.setScalar(Math.max(0.001, 1 - seg(p, 0.12, 0.2) * 0.8));
      (stamp.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - seg(p, 0.16, 0.24));
    }
    if (seal.current) seal.current.rotation.z = -0.4 + seg(p, 0.14, 0.22) * 0.9;
  });
  return (
    <group>
      <mesh position={[0, 1.6, 0]}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color={C.deep} roughness={0.4} />
      </mesh>
      <group ref={card} position={[0, -0.3, 0]}>
        <RoundedBox args={[2.1, 1.32, 0.05]} radius={0.07} smoothness={3}>
          <meshStandardMaterial color={C.card} roughness={0.3} />
        </RoundedBox>
        <mesh position={[0, 0.38, 0.04]}>
          <boxGeometry args={[1.2, 0.05, 0.004]} />
          <meshStandardMaterial color={C.deep} />
        </mesh>
        <mesh position={[-0.3, 0.1, 0.04]}>
          <boxGeometry args={[0.9, 0.03, 0.004]} />
          <meshStandardMaterial color="#DDD9CE" />
        </mesh>
        <mesh position={[-0.45, -0.08, 0.04]}>
          <boxGeometry args={[0.62, 0.03, 0.004]} />
          <meshStandardMaterial color="#DDD9CE" />
        </mesh>
        <mesh ref={seal} position={[0.66, -0.36, 0.05]} rotation={[0, 0, -0.4]}>
          <torusGeometry args={[0.13, 0.016, 10, 32]} />
          <meshStandardMaterial color={C.teal} />
        </mesh>
      </group>
      <mesh ref={stamp} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.55, 0.02, 8, 48]} />
        <meshBasicMaterial color={C.teal} transparent opacity={0.7} />
      </mesh>
      <Label y={132}>University issues credential</Label>
    </group>
  );
};

/* ---------------------- Station 1: Dual-state split ----------------------- */

const StationSplit: FC<{ progress: PRef }> = ({ progress }) => {
  const pub = useRef<THREE.Group>(null);
  const priv = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const p = at(progress);
    const t = seg(p, 0.17, 0.33);
    const bob = Math.sin(clock.elapsedTime * 0.8) * 0.04;
    if (pub.current) {
      pub.current.position.x = -0.95 - t * 1.75;
      pub.current.position.y = bob;
    }
    if (priv.current) {
      priv.current.position.x = 0.95 + t * 1.75;
      priv.current.position.y = -bob;
    }
  });
  return (
    <group position={[STATION, 0, 0]}>
      <group ref={pub}>
        <RoundedBox args={[1.7, 1.05, 0.05]} radius={0.06} smoothness={3}>
          <meshStandardMaterial color={C.card} roughness={0.3} />
        </RoundedBox>
        <mesh position={[-0.3, 0.22, 0.04]}>
          <boxGeometry args={[0.9, 0.045, 0.004]} />
          <meshStandardMaterial color={C.academic} />
        </mesh>
        <mesh position={[-0.42, -0.02, 0.04]}>
          <boxGeometry args={[0.72, 0.03, 0.004]} />
          <meshStandardMaterial color="#DDD9CE" />
        </mesh>
        <mesh position={[-0.42, -0.22, 0.04]}>
          <boxGeometry args={[0.6, 0.03, 0.004]} />
          <meshStandardMaterial color="#DDD9CE" />
        </mesh>
        <Label y={82}>Public ledger state</Label>
      </group>
      <group ref={priv}>
        <RoundedBox args={[1.7, 1.05, 0.05]} radius={0.06} smoothness={3}>
          <meshStandardMaterial color={C.private} roughness={0.45} />
        </RoundedBox>
        {[-0.2, 0, 0.2].map((y) => (
          <mesh key={y} position={[0, y, 0.04]}>
            <boxGeometry args={[1.05, 0.05, 0.004]} />
            <meshStandardMaterial color={C.teal} transparent opacity={0.55} roughness={0.5} />
          </mesh>
        ))}
        <Label y={82}>Private witness state</Label>
      </group>
      <mesh position={[0, 1.5, 0]}>
        <octahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={C.sand} roughness={0.35} />
      </mesh>
    </group>
  );
};

/* ----------------------- Station 2: Claim selection ----------------------- */

const StationClaim: FC<{ progress: PRef }> = ({ progress }) => {
  const orbit = useRef<THREE.Group>(null);
  const chosen = useRef<THREE.Group>(null);
  const dots = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return {
          pos: [Math.cos(a) * 1.25, Math.sin(a) * 0.5, Math.sin(a) * 1.25] as [number, number, number],
          pick: i === 2,
        };
      }),
    [],
  );
  useFrame(({ clock }) => {
    const p = at(progress);
    const t = seg(p, 0.34, 0.5);
    if (orbit.current) orbit.current.rotation.y = clock.elapsedTime * 0.3 + (1 - t) * 1.4;
    if (chosen.current) {
      const c = seg(p, 0.42, 0.52);
      chosen.current.position.y = 0.1 + (1 - c) * 0.55;
      chosen.current.scale.setScalar(Math.max(0.001, 0.001 + c));
    }
  });
  return (
    <group position={[STATION * 2, 0, 0]}>
      <RoundedBox args={[1.75, 1.08, 0.05]} radius={0.06} smoothness={3}>
        <meshStandardMaterial color={C.private} roughness={0.45} />
      </RoundedBox>
      <group ref={orbit}>
        {dots.map((d, i) => (
          <mesh key={i} position={d.pos}>
            <sphereGeometry args={[d.pick ? 0.075 : 0.055, 10, 10]} />
            <meshStandardMaterial color={d.pick ? C.teal : C.sage} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <group ref={chosen} position={[0, 0.1, 0.75]}>
        <mesh>
          <icosahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={0.3} roughness={0.3} />
        </mesh>
      </group>
      <Label y={82}>Student selects a claim</Label>
    </group>
  );
};

/* ------------------------- Station 3: ZK circuit -------------------------- */

const StationCircuit: FC<{ progress: PRef }> = ({ progress }) => {
  const torusA = useRef<THREE.Mesh>(null);
  const torusB = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const swarm = useRef<THREE.Points>(null);
  const { swarmPos, seeds, count } = useMemo(() => {
    const count = 130;
    const swarmPos = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      seeds[i * 2] = Math.random() * Math.PI * 2;
      seeds[i * 2 + 1] = 0.55 + Math.random();
      swarmPos[i * 3 + 1] = 0;
    }
    return { swarmPos, seeds, count };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = at(progress);
    const converge = seg(p, 0.5, 0.68);
    if (torusA.current) {
      torusA.current.rotation.x = t * 0.4;
      torusA.current.rotation.y = t * 0.2;
    }
    if (torusB.current) {
      torusB.current.rotation.y = -t * 0.34;
      torusB.current.rotation.z = t * 0.18;
    }
    if (core.current) {
      core.current.rotation.y = t * 0.5;
      core.current.scale.setScalar(0.35 + converge * 1.05);
    }
    if (swarm.current) {
      const attr = swarm.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const ang = seeds[i * 2] + t * 0.3;
        const rad = seeds[i * 2 + 1] * (2.7 - converge * 2.05);
        arr[i * 3] = Math.cos(ang) * rad;
        arr[i * 3 + 1] = Math.sin(ang * 0.8 + i) * (0.95 - converge * 0.55);
        arr[i * 3 + 2] = Math.sin(ang) * rad;
      }
      attr.needsUpdate = true;
    }
  });

  return (
    <group position={[STATION * 3, 0, 0]}>
      <mesh ref={torusA}>
        <torusGeometry args={[0.85, 0.012, 8, 72]} />
        <meshBasicMaterial color={C.line} transparent opacity={0.85} />
      </mesh>
      <mesh ref={torusB}>
        <torusGeometry args={[1.18, 0.01, 8, 72]} />
        <meshBasicMaterial color={C.line} transparent opacity={0.5} />
      </mesh>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={C.deep} flatShading roughness={0.35} metalness={0.08} />
      </mesh>
      <points ref={swarm}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[swarmPos, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.042} color={C.teal} transparent opacity={0.55} depthWrite={false} sizeAttenuation />
      </points>
      <Label y={124}>Compact ZK circuit proves the claim</Label>
    </group>
  );
};

/* ---------------------- Station 4: Proof in transit ----------------------- */

const StationTransit: FC<{ progress: PRef }> = ({ progress }) => {
  const proof = useRef<THREE.Group>(null);
  const curve = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-2.3, 0.45, 0),
        new THREE.Vector3(0, 1.45, 0.35),
        new THREE.Vector3(2.3, 0.05, 0),
      ),
    [],
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const p = at(progress);
    const t = seg(p, 0.66, 0.85);
    if (proof.current) {
      curve.getPoint(t, tmp);
      proof.current.position.copy(tmp);
      proof.current.rotation.set(clock.elapsedTime * 0.55, clock.elapsedTime * 0.8, 0);
      proof.current.scale.setScalar(0.78 + Math.sin(clock.elapsedTime * 2.6) * 0.04);
    }
  });
  return (
    <group position={[STATION * 4, 0, 0]}>
      <mesh>
        <tubeGeometry args={[curve, 32, 0.005, 6, false]} />
        <meshBasicMaterial color={C.line} transparent opacity={0.7} />
      </mesh>
      <group ref={proof}>
        <mesh>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={0.35} roughness={0.25} />
        </mesh>
      </group>
      <mesh position={[-2.3, 0.45, 0]}>
        <icosahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial color={C.academic} roughness={0.4} />
      </mesh>
      <mesh position={[2.3, 0.05, 0]}>
        <icosahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial color={C.sage} roughness={0.4} />
      </mesh>
      <Label y={82}>Proof travels to the verifier</Label>
    </group>
  );
};

/* ------------------------- Station 5: Verifier ---------------------------- */

const StationVerify: FC<{ progress: PRef }> = ({ progress }) => {
  const ring = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const tickCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.16, 0.0, 0),
        new THREE.Vector3(-0.05, -0.13, 0),
        new THREE.Vector3(0.2, 0.15, 0),
      ]),
    [],
  );
  useFrame(({ clock }, dt) => {
    const p = at(progress);
    const t = seg(p, 0.85, 1);
    if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.16;
    if (ring2.current) {
      ring2.current.rotation.z = -clock.elapsedTime * 0.1;
      const s = damp(ring2.current.scale.x, 0.62 + t * 0.38, 6, dt);
      ring2.current.scale.setScalar(s);
    }
  });
  return (
    <group position={[STATION * 5, 0, 0]}>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[1.7, 0.85, 0.05]} />
        <meshStandardMaterial color={C.card} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.2, 0.04]}>
        <boxGeometry args={[0.8, 0.045, 0.004]} />
        <meshStandardMaterial color={C.deep} />
      </mesh>
      <mesh position={[-0.25, 0.9, 0.04]}>
        <boxGeometry args={[0.55, 0.03, 0.004]} />
        <meshStandardMaterial color="#DDD9CE" />
      </mesh>
      <group position={[0, -0.3, 0.2]}>
        <mesh ref={ring}>
          <torusGeometry args={[0.5, 0.02, 10, 60]} />
          <meshStandardMaterial color={C.deep} roughness={0.35} />
        </mesh>
        <mesh ref={ring2}>
          <torusGeometry args={[0.36, 0.012, 10, 48]} />
          <meshStandardMaterial color={C.teal} roughness={0.35} />
        </mesh>
        <mesh>
          <tubeGeometry args={[tickCurve, 12, 0.028, 6, false]} />
          <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={0.25} />
        </mesh>
      </group>
      <Label y={-74}>Verified — private data stays private</Label>
    </group>
  );
};

/* -------------------------------------------------------------------------- */

const ScrollStations: FC<ScrollSceneProps> = ({ progress }) => {
  const root = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!root.current) return;
    const p = at(progress);
    root.current.position.x = damp(root.current.position.x, -p * SPAN, 5, dt);
    root.current.position.y = Math.sin(p * Math.PI) * -0.12;
  });
  return (
    <>
      <ambientLight intensity={1.05} />
      <directionalLight position={[2, 4, 6]} intensity={1.15} />
      <pointLight position={[0, 1, 4]} intensity={12} color={C.teal} distance={13} decay={2} />
      <group ref={root}>
        <Rail />
        <StationIssue progress={progress} />
        <StationSplit progress={progress} />
        <StationClaim progress={progress} />
        <StationCircuit progress={progress} />
        <StationTransit progress={progress} />
        <StationVerify progress={progress} />
      </group>
      <fog attach="fog" args={['#FAFAF8', 10, 18]} />
    </>
  );
};

const HowItWorksScene: FC<ScrollSceneProps> = ({ progress }) => {
  const reduced = usePrefersReducedMotion();
  return (
    <SceneCanvas
      reduced={reduced}
      className="h-full w-full"
      camera={{ position: [0, 0.1, 7.8], fov: 44 }}
      maxDpr={reduced ? 1.5 : 1.75}
    >
      <ScrollStations progress={progress} />
    </SceneCanvas>
  );
};

export default HowItWorksScene;
