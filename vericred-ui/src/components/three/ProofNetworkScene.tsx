// VeriCred — Credential Proof Network hero visualization.
// A deterministic pentagon ring: University → Credential → ZK Proof → Student →
// Verifier, all nodes on one circle at even 72° spacing, proof particles flowing
// clockwise along the ring, with the credential card anchored at the center.

import { useMemo, useRef } from 'react';
import type { FC } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html } from '@react-three/drei';
import { SceneCanvas, useIsCompact, usePrefersReducedMotion, damp, clamp } from './scene-utils';

const PALETTE = {
  deep: '#173B57',
  academic: '#2F6B8A',
  teal: '#4F8582',
  sage: '#7FA396',
  sand: '#C9B99A',
  line: '#B9B7AE',
  card: '#FDFCFA',
};

const RING_R = 2.92;
const FLATTEN_Y = 0.9;

interface NodeDef {
  key: string;
  label: string;
  angle: number; // degrees
  color: string;
}

// Clockwise order, even 72° spacing: top → right → lower-right → lower-left → left.
const NODES: NodeDef[] = [
  { key: 'university', label: 'University', angle: 90, color: PALETTE.deep },
  { key: 'credential', label: 'Credential', angle: 18, color: PALETTE.sand },
  { key: 'zk', label: 'ZK Proof', angle: -54, color: PALETTE.teal },
  { key: 'student', label: 'Student', angle: -126, color: PALETTE.academic },
  { key: 'verifier', label: 'Verifier', angle: -198, color: PALETTE.sage },
];

const ringPoint = (deg: number): THREE.Vector3 => {
  const a = (deg * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(a) * RING_R, Math.sin(a) * RING_R * FLATTEN_Y, 0);
};

const CARD_POS = new THREE.Vector3(0, -0.05, 1.05);

/** Exact arc of the ring between two node angles (the flow follows the circle itself). */
function arcBetween(a0: number, a1: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const steps = 22;
  const delta = a1 - a0;
  for (let i = 0; i <= steps; i++) {
    pts.push(ringPoint(a0 + (delta * i) / steps));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
}

function spokeToCard(from: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const mid = from.clone().add(CARD_POS).multiplyScalar(0.5);
  mid.z += 0.28;
  return new THREE.QuadraticBezierCurve3(from.clone(), mid, CARD_POS.clone());
}

/* -------------------------------------------------------------------------- */
/* Ring geometry + flowing proof particles                                     */
/* -------------------------------------------------------------------------- */

const LINK_CURVES = (() => {
  const arcs: THREE.Curve<THREE.Vector3>[] = [];
  for (let i = 0; i < NODES.length - 1; i++) {
    arcs.push(arcBetween(NODES[i].angle, NODES[i + 1].angle));
  }
  return arcs;
})();

const SPOKES: THREE.QuadraticBezierCurve3[] = [
  spokeToCard(ringPoint(NODES[1].angle)), // credential → card
  spokeToCard(ringPoint(NODES[2].angle)), // zk proof → card
];

const RingGeometry: FC = () => {
  const guides = useMemo(() => {
    const loopPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 72; i++) loopPts.push(ringPoint((i / 72) * 360));
    return {
      loop: new THREE.CatmullRomCurve3(loopPts, true),
      links: LINK_CURVES,
      spokes: SPOKES,
    };
  }, []);

  return (
    <>
      {/* faint full-circle guide */}
      <mesh>
        <tubeGeometry args={[guides.loop, 96, 0.0032, 5, true]} />
        <meshBasicMaterial color={PALETTE.line} transparent opacity={0.22} />
      </mesh>
      {guides.links.map((c, i) => (
        <mesh key={`l${i}`}>
          <tubeGeometry args={[c, 24, 0.0052, 6, false]} />
          <meshBasicMaterial color={PALETTE.line} transparent opacity={0.6} />
        </mesh>
      ))}
      {guides.spokes.map((c, i) => (
        <mesh key={`s${i}`}>
          <tubeGeometry args={[c, 16, 0.004, 6, false]} />
          <meshBasicMaterial color={PALETTE.line} transparent opacity={0.32} />
        </mesh>
      ))}
    </>
  );
};

const FlowParticles: FC<{ compact: boolean }> = ({ compact }) => {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const particles = useMemo(() => {
    const list: { curve: THREE.Curve<THREE.Vector3>; offset: number; speed: number; color: THREE.Color }[] = [];
    LINK_CURVES.forEach((curve, li) => {
      const perLink = compact ? 3 : 7;
      for (let i = 0; i < perLink; i++) {
        list.push({
          curve,
          offset: (i / perLink + li * 0.17) % 1,
          speed: 0.1 + li * 0.008,
          color: new THREE.Color(NODES[li].color),
        });
      }
    });
    SPOKES.forEach((curve, si) => {
      const per = compact ? 2 : 4;
      for (let i = 0; i < per; i++) {
        list.push({
          curve,
          offset: i / per,
          speed: 0.14,
          color: new THREE.Color(PALETTE.card).lerp(new THREE.Color(NODES[si === 0 ? 1 : 2].color), 0.5),
        });
      }
    });
    return list;
  }, [compact]);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    particles.forEach((p, i) => {
      p.color.toArray(colors, i * 3);
      p.curve.getPoint(p.offset).toArray(positions, i * 3);
    });
    return { positions, colors };
  }, [particles]);

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      const u = (t * p.speed + p.offset) % 1;
      p.curve.getPoint(clamp(u, 0, 1), tmp);
      tmp.toArray(positions, i * 3);
    });
    if (geomRef.current) geomRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <points key={particles.length}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={compact ? 0.075 : 0.05}
        vertexColors
        transparent
        opacity={0.92}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

/* -------------------------------------------------------------------------- */
/* Nodes — exact positions, identical construction, hover scale only           */
/* -------------------------------------------------------------------------- */

const NetworkNode: FC<{ node: NodeDef; index: number; compact: boolean }> = ({ node, index, compact }) => {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Mesh>(null);
  const hovered = useRef(0);

  const pos = useMemo(() => ringPoint(node.angle), [node.angle]);
  const labelOffset = useMemo(() => {
    const a = (node.angle * Math.PI) / 180;
    const outward = compact ? 34 : 46;
    return { x: Math.cos(a) * outward, y: -Math.sin(a) * outward * 0.8 };
  }, [node.angle, compact]);

  useFrame(({ clock }, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const target = hovered.current ? 1.28 : 1;
    g.scale.setScalar(damp(g.scale.x, target, 9, dt));
    if (spinRef.current) spinRef.current.rotation.z = clock.getElapsedTime() * 0.22 * (index % 2 ? -1 : 1);
  });

  return (
    <group
      ref={groupRef}
      position={[pos.x, pos.y, pos.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        hovered.current = 1;
      }}
      onPointerOut={() => {
        hovered.current = 0;
      }}
    >
      <mesh>
        <icosahedronGeometry args={[0.145, 1]} />
        <meshStandardMaterial color={node.color} roughness={0.4} metalness={0.05} />
      </mesh>
      {!compact && (
        <mesh ref={spinRef} rotation={[Math.PI / 2.6, 0, 0]}>
          <torusGeometry args={[0.25, 0.004, 6, 56]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.45} />
        </mesh>
      )}
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div
          className="chip whitespace-nowrap"
          style={{ transform: `translate(${labelOffset.x}px, ${labelOffset.y}px)`, fontSize: 10 }}
        >
          {node.label}
        </div>
      </Html>
    </group>
  );
};

/* -------------------------------------------------------------------------- */
/* Central credential card                                                     */
/* -------------------------------------------------------------------------- */

const CredentialCard: FC<{ compact: boolean }> = ({ compact }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    // one shared, predictable breath — the ring itself stays still
    ref.current.position.y = CARD_POS.y + Math.sin(clock.getElapsedTime() * 0.45) * 0.035;
  });
  return (
    <group ref={ref} position={CARD_POS.toArray()} rotation={[0.07, -0.24, 0]}>
      {/* frame plate */}
      <RoundedBox args={[2.24, 1.46, 0.05]} radius={0.085} smoothness={3} position={[0, 0, -0.032]}>
        <meshStandardMaterial color={PALETTE.deep} roughness={0.5} />
      </RoundedBox>
      {/* card surface */}
      <RoundedBox args={[2.08, 1.31, 0.06]} radius={0.068} smoothness={3}>
        <meshStandardMaterial color={PALETTE.card} roughness={0.32} metalness={0.02} />
      </RoundedBox>
      {/* header rule */}
      <mesh position={[-0.16, 0.42, 0.04]}>
        <boxGeometry args={[1.26, 0.05, 0.004]} />
        <meshStandardMaterial color={PALETTE.deep} roughness={0.4} />
      </mesh>
      {/* body rules */}
      {[0.17, 0.03, -0.11].map((y, i) => (
        <mesh key={y} position={[-0.3 + i * 0.03, y, 0.04]}>
          <boxGeometry args={[0.98 - i * 0.14, 0.026, 0.004]} />
          <meshStandardMaterial color="#DDD9CE" roughness={0.6} />
        </mesh>
      ))}
      {/* verification seal */}
      <group position={[-0.6, -0.38, 0.045]}>
        <mesh>
          <torusGeometry args={[0.115, 0.013, 10, 40]} />
          <meshStandardMaterial color={PALETTE.teal} roughness={0.35} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.095, 24]} />
          <meshStandardMaterial color={PALETTE.card} roughness={0.4} />
        </mesh>
      </group>
      {/* crest chip */}
      <mesh position={[0.68, -0.34, 0.045]}>
        <boxGeometry args={[0.32, 0.22, 0.012]} />
        <meshStandardMaterial color={PALETTE.academic} roughness={0.3} />
      </mesh>
      {!compact && (
        <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className="whitespace-nowrap"
            style={{
              transform: 'translateY(92px)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#6B6B67',
            }}
          >
            Credential · Sealed
          </div>
        </Html>
      )}
    </group>
  );
};

/* -------------------------------------------------------------------------- */
/* Root                                                                        */
/* -------------------------------------------------------------------------- */

const ProofNetwork: FC = () => {
  const compact = useIsCompact();
  const rootRef = useRef<THREE.Group>(null);

  useFrame(({ pointer, clock }, dt) => {
    const root = rootRef.current;
    if (!root) return;
    const t = clock.getElapsedTime();
    const scroll = clamp(window.scrollY / Math.max(1, window.innerHeight), 0, 1);
    // deterministic yaw oscillation + mouse parallax + gentle scroll tilt
    const targetRotY = Math.sin(t * 0.16) * 0.1 + pointer.x * 0.14 + scroll * 0.16;
    const targetRotX = -0.14 + pointer.y * 0.06 + scroll * 0.18;
    root.rotation.y = damp(root.rotation.y, targetRotY, 2.2, dt);
    root.rotation.x = damp(root.rotation.x, targetRotX, 2.2, dt);
    const scale = compact ? 0.6 : 1;
    if (Math.abs(root.scale.x - scale) > 0.001) root.scale.setScalar(damp(root.scale.x, scale, 6, dt));
  });

  return (
    <>
      <ambientLight intensity={1.05} />
      <directionalLight position={[3, 4, 5]} intensity={1.35} color="#FFFDF7" />
      <pointLight position={[-3, -1, 4]} intensity={14} color={PALETTE.teal} distance={9} decay={2} />
      <group ref={rootRef}>
        <RingGeometry />
        <FlowParticles compact={compact} />
        {NODES.map((node, i) => (
          <NetworkNode key={node.key} node={node} index={i} compact={compact} />
        ))}
        <CredentialCard compact={compact} />
      </group>
    </>
  );
};

const ProofNetworkScene: FC = () => {
  const reduced = usePrefersReducedMotion();
  const compact = useIsCompact();
  return (
    <SceneCanvas
      reduced={reduced}
      className="h-full w-full"
      camera={{ position: [0, 0.1, 8.8], fov: 45 }}
      maxDpr={reduced ? 1.4 : compact ? 1.2 : 1.8}
    >
      <ProofNetwork />
    </SceneCanvas>
  );
};

export default ProofNetworkScene;
