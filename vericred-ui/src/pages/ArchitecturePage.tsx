import { Suspense, lazy, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Box, Database, Cpu, EyeOff, Network, ScrollText, Users } from 'lucide-react';
import { SectionHead } from './LandingPage';
import { Reveal } from '../components/ui/primitives';
import type { ArchKey } from '../components/three/architecture-data';
import { ARCH_COPY, ARCH_NODES } from '../components/three/architecture-data';

const ArchitectureScene = lazy(() => import('../components/three/ArchitectureScene'));

const KEY_ICON: Record<ArchKey, FC<{ className?: string }>> = {
  university: Users,
  credential: ScrollText,
  public: Database,
  private: EyeOff,
  circuit: Cpu,
  proof: Box,
  verifier: Network,
};

const CIRCUITS = [
  { name: 'issueCredential', desc: 'Anchor a new commitment as VALID under the institution key.' },
  { name: 'verifyCredential', desc: 'Read-only status check of a commitment on the public ledger.' },
  { name: 'proveGpaThreshold', desc: 'Witness check: studentGpaScaled ≥ requested floor.' },
  { name: 'proveDegreeMatch', desc: 'Witness check: degree hash equals the claimed program.' },
  { name: 'suspendCredential / reinstateCredential', desc: 'Institution-controlled temporary status transitions.' },
  { name: 'revokeCredential', desc: 'Permanent status transition, visible to every verifier.' },
];

export const ArchitecturePage: FC = () => {
  const [hovered, setHovered] = useState<ArchKey | null>(null);
  const shown = hovered ?? 'credential';
  const Copy = ARCH_COPY[shown];

  return (
    <div>
      <section className="border-b border-line bg-paper" style={{ padding: '152px 0 72px' }}>
        <div className="container-vc">
          <SectionHead
            overline="Privacy architecture"
            title={
              <>
                Two states. <span className="italic text-deep">One proof.</span>
              </>
            }
            body="VeriCred’s dual-state design separates what must be public from what must stay private — and joins them only inside a compact circuit. Hover the network to inspect each layer."
          />
        </div>
      </section>

      <section style={{ padding: '56px 0 104px' }}>
        <div className="container-vc grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_1fr]">
          {/* 3D interactive */}
          <div className="card relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
              <span className="mono-label">Dual-state topology</span>
              <span className="flex items-center gap-4 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-academic">
                  <span className="h-1.5 w-1.5 rounded-full bg-academic" /> public
                </span>
                <span className="flex items-center gap-1.5 text-teal">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal" /> private
                </span>
              </span>
            </div>
            <div className="h-[460px] sm:h-[560px]">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-mist">
                      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-teal" />
                      <span className="mono-label">Loading architecture…</span>
                    </div>
                  </div>
                }
              >
                <ArchitectureScene hovered={hovered} onHover={setHovered} />
              </Suspense>
            </div>
            {/* touch-friendly selector */}
            <div className="flex flex-wrap gap-2 border-t border-line-soft px-5 py-4">
              {ARCH_NODES.map((n) => (
                <button
                  key={n.key}
                  onClick={() => setHovered(n.key)}
                  className={`badge transition-colors ${
                    shown === n.key ? 'badge-info' : 'badge-neutral hover:border-teal/40'
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* Explanation panel */}
          <div className="flex flex-col gap-6">
            <div className="card p-7">
              <motion.div
                key={shown}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-deep/[0.06] text-deep">
                    {(() => {
                      const Icon = KEY_ICON[shown];
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </span>
                  <div>
                    <p className="mono-label">{Copy.tag}</p>
                    <h3 className="text-title-lg text-ink">{Copy.title}</h3>
                  </div>
                </div>
                <p className="mt-4 text-body-md text-graphite">{Copy.body}</p>
              </motion.div>
            </div>

            <Reveal delay={0.1}>
              <div className="card-dark p-6 font-mono text-[12.5px] leading-relaxed text-on-dark-mute">
                <p className="mb-3 mono-label !text-on-dark-mute">Ledger view</p>
                <pre className="whitespace-pre">{`credentialStatus: Map<Bytes<32>, CredentialStatus>
institutionOwner : Bytes<32>          // institution key
totalIssued      : Counter

// never present on-chain:
//   GPA · names · transcript · identity`}</pre>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="card p-6">
                <p className="mono-label mb-3">Witness bundle (local, encrypted)</p>
                <ul className="space-y-2 text-body-sm text-graphite">
                  <li className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal" /> studentGpaScaled — e.g. <b>371</b>, revealed
                    only as a boolean
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal" /> degreeIdHash — 32-byte program commitment
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal" /> localSecretKey — holder authorization, never
                    transmitted
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Circuits table */}
        <div className="container-vc mt-20">
          <Reveal>
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <h3 className="text-title-md text-ink">Compiled Compact circuits</h3>
                <Link to="/settings" className="link-quiet text-caption">
                  Endpoint configuration <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <table className="table-vc">
                <thead>
                  <tr>
                    <th>Circuit</th>
                    <th>Responsibility</th>
                    <th className="hidden md:table-cell">State touched</th>
                  </tr>
                </thead>
                <tbody>
                  {CIRCUITS.map((c) => (
                    <tr key={c.name}>
                      <td className="font-mono text-[13px] font-semibold text-deep">{c.name}</td>
                      <td className="text-body-sm text-graphite">{c.desc}</td>
                      <td className="hidden md:table-cell">
                        <span className="chip !py-1 text-[10.5px]">
                          {c.name.startsWith('prove')
                            ? 'public + private'
                            : c.name.includes('Credential')
                              ? 'public'
                              : 'public'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default ArchitecturePage;
