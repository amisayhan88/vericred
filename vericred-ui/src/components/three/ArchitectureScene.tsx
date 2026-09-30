// VeriCred — interactive privacy architecture visualization.
// Dual-state topology: University → Credential Data → (Public Ledger | Private Witness)
// → Compact ZK Circuit → ZK Proof → Verifier. Hoverable nodes with explanations.

import { useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html } from '@react-three/drei';
import { SceneCanvas, usePrefersReducedMotion, damp } from './scene-utils';
import { ARCH_NODES } from './architecture-data';
import type { ArchKey, ArchNodeDef } from './architecture-data';
export type { ArchKey };

const C = {
  deep: '#173B57',
  academic: '#2F6B8A',
  teal: '#4F8582',
  sage: '#7FA396',
  sand: '#C9B99A',
  line: '#B9B7AE',
  card: '#FDFCFA',
};

const LINKS: Array<[ArchKey, ArchKey, number]> = [
  ['university', 'credential', 0.3],
  ['credential', 'public', 0.18],
  ['credential', 'private', 0.18],
  ['public', 'circuit', 0.18],
  ['private', 'circuit', 0.18],
  ['circuit', 'proof', 0.25],
  ['proof', 'verifier', 0.25],
];

function curveFor(a: ArchNodeDef, b: ArchNodeDef, bulge: number): THREE.QuadraticBezierCurve3 {
  const va = new THREE.Vector3(...a.position);
  const vb = new THREE.Vector3(...b.position);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const dir = vb.clone().sub(va);
  const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
  const sign = va.x <= vb.x ? 1 : -1;
  return new THREE.QuadraticBezierCurve3(
    va,
    mid.clone().add(perp.multiplyScalar(sign * mid.length() * bulge + 0.15)),
    vb,
  );
}

interface NodeState {
  hovered: ArchKey | null;
  setHovered: (k: ArchKey | null) => void;
}

const ArchNode: FC<{
  def: ArchNodeDef;
  index: number;
  state: NodeState;
  selected: boolean;
}> = ({ def, index, state, selected }) => {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const [localHover, setLocalHover] = useState(false);
  const isMain = def.key === 'credential' || def.key === 'circuit';

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.position.y = def.position[1] + Math.sin(t * 0.5 + index) * 0.045;
    const target = localHover || selected ? 1.14 : 1;
    const s = damp(g.scale.x, target, 9, dt);
    g.scale.setScalar(s);
    if (ring.current) ring.current.rotation.z = t * 0.2 * (index % 2 === 0 ? 1 : -1);
  });

  return (
    <group
      ref={group}
      position={def.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setLocalHover(true);
        state.setHovered(def.key);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setLocalHover(false);
        state.setHovered(null);
        document.body.style.cursor = '';
      }}
    >
      {isMain ? (
        <RoundedBox args={[1.5, 0.42, 0.09]} radius={0.06} smoothness={3}>
          <meshStandardMaterial color={def.key === 'circuit' ? C.deep : C.card} roughness={0.35} />
        </RoundedBox>
      ) : (
        <mesh>
          {def.key === 'proof' ? <octahedronGeometry args={[0.2, 0]} /> : <icosahedronGeometry args={[0.17, 1]} />}
          <meshStandardMaterial
            color={def.tone}
            roughness={0.38}
            emissive={localHover ? def.tone : '#000000'}
            emissiveIntensity={localHover ? 0.22 : 0}
          />
        </mesh>
      )}
      {!isMain && (
        <mesh ref={ring} rotation={[Math.PI / 2.5, 0, 0]}>
          <torusGeometry args={[0.3, 0.004, 6, 48]} />
          <meshBasicMaterial color={def.tone} transparent opacity={0.45} />
        </mesh>
      )}
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div
          className="whitespace-nowrap"
          style={{
            transform: `translateY(${isMain ? 34 : 30}px)`,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: isMain ? 11 : 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: isMain ? (def.key === 'circuit' ? C.card : C.deep) : '#5A5A56',
            background: isMain ? 'transparent' : 'rgba(250,250,248,0.8)',
            padding: isMain ? '0' : '2px 6px',
            borderRadius: 4,
          }}
        >
          {def.label}
        </div>
      </Html>
    </group>
  );
};

const FlowDots: FC = () => {
  const points = useRef<THREE.Points>(null);
  const { pos, curves, seeds, count } = useMemo(() => {
    const map = Object.fromEntries(ARCH_NODES.map((n) => [n.key, n])) as Record<ArchKey, ArchNodeDef>;
    const curves = LINKS.map(([a, b, bulge]) => curveFor(map[a], map[b], bulge));
    const perCurve = 7;
    const count = curves.length * perCurve;
    const pos = new Float32Array(count * 3);
    const seeds = Array.from({ length: count }, (_, i) => ({
      curve: Math.floor(i / perCurve),
      offset: (i % perCurve) / perCurve,
      speed: 0.14 + (i % 3) * 0.03,
    }));
    return { pos, curves, seeds, count };
  }, []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = clock.elapsedTime;
    const attr = points.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      const u = (t * s.speed + s.offset) % 1;
      curves[s.curve].getPoint(u, tmp);
      tmp.toArray(arr, i * 3);
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color={C.teal} transparent opacity={0.75} depthWrite={false} sizeAttenuation />
    </points>
  );
};

const ArchitectureGraph: FC<{ hovered: ArchKey | null; setHovered: (k: ArchKey | null) => void }> = ({
  hovered,
  setHovered,
}) => {
  const root = useRef<THREE.Group>(null);
  const map = useMemo(() => Object.fromEntries(ARCH_NODES.map((n) => [n.key, n])) as Record<ArchKey, ArchNodeDef>, []);
  const curves = useMemo(() => LINKS.map(([a, b, bulge]) => curveFor(map[a], map[b], bulge)), [map]);

  useFrame(({ pointer }, dt) => {
    if (!root.current) return;
    const rx = damp(root.current.rotation.x, pointer.y * 0.06, 2.5, dt);
    const ry = damp(root.current.rotation.y, pointer.x * 0.14, 2.5, dt);
    root.current.rotation.set(rx, ry, 0);
  });

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[2, 3, 5]} intensity={1.1} />
      <pointLight position={[-2, 0, 3]} intensity={10} color={C.academic} distance={9} decay={2} />
      <group ref={root}>
        {curves.map((c, i) => (
          <mesh key={i}>
            <tubeGeometry args={[c, 24, 0.0045, 6, false]} />
            <meshBasicMaterial color={i === 2 ? C.teal : i === 1 ? C.academic : C.line} transparent opacity={0.65} />
          </mesh>
        ))}
        <FlowDots />
        {ARCH_NODES.map((def, i) => (
          <ArchNode key={def.key} def={def} index={i} state={{ hovered, setHovered }} selected={hovered === def.key} />
        ))}
      </group>
    </>
  );
};

interface ArchitectureSceneProps {
  hovered: ArchKey | null;
  onHover: (k: ArchKey | null) => void;
}

const ArchitectureScene: FC<ArchitectureSceneProps> = ({ hovered, onHover }) => {
  const reduced = usePrefersReducedMotion();
  return (
    <SceneCanvas
      reduced={reduced}
      className="h-full w-full"
      camera={{ position: [0, 0, 8.4], fov: 44 }}
      maxDpr={reduced ? 1.5 : 1.75}
    >
      <ArchitectureGraph hovered={hovered} setHovered={onHover} />
    </SceneCanvas>
  );
};

export default ArchitectureScene;
