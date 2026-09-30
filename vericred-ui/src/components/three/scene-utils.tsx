import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject, FunctionComponent } from 'react';
import { Canvas } from '@react-three/fiber';

/* -------------------------------------------------------------------------- */
/* Media / motion hooks (DOM-safe, usable inside and outside R3F trees)        */
/* -------------------------------------------------------------------------- */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setCompact(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

export function useInView<T extends HTMLElement>(rootMargin = '120px'): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView];
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Eased progress segment: 0..1 within [start, end] of a global progress value. */
export const seg = (p: number, start: number, end: number) => {
  const t = clamp((p - start) / Math.max(1e-6, end - start), 0, 1);
  return t * t * (3 - 2 * t); // smoothstep
};

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/* -------------------------------------------------------------------------- */
/* SceneCanvas — visibility-gated, dpr-capped WebGL wrapper                    */
/* -------------------------------------------------------------------------- */

export interface SceneCanvasProps {
  children: ReactNode;
  className?: string;
  camera: { position: [number, number, number]; fov?: number };
  maxDpr?: number;
  reduced?: boolean;
}

export const SceneCanvas: FunctionComponent<SceneCanvasProps> = ({
  children,
  className = '',
  camera,
  maxDpr = 1.6,
  reduced,
}) => {
  const [wrapRef, inView] = useInView<HTMLDivElement>('160px');
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const active = inView && pageVisible && !reduced;

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <Canvas
        onCreated={(state) => {
          if (reduced) setTimeout(() => state.invalidate(), 80);
        }}
        frameloop={reduced ? 'demand' : active ? 'always' : 'never'}
        camera={{ position: camera.position, fov: camera.fov ?? 42 }}
        dpr={[1, maxDpr]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        {children}
      </Canvas>
    </div>
  );
};
