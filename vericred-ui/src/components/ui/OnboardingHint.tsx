import { useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, X } from 'lucide-react';

const STORAGE_KEY = 'vericred-onboarding-dismissed';

const COPY: Record<string, { title: string; steps: string[] }> = {
  wallet: {
    title: 'New to VeriCred?',
    steps: [
      'Each card is a credential issued by an institution, with live ledger status.',
      '“Generate proof” proves one claim (e.g. GPA ≥ 3.5) without revealing the record.',
      'Share the proof link or QR — verifiers see only what you disclose.',
    ],
  },
  verify: {
    title: 'Verifying for the first time?',
    steps: [
      'Enter the VP-… verification id (or VC-… credential id) you received.',
      'The check reveals the claim and institution — never the transcript.',
      'Revoked, suspended or expired credentials fail here instantly.',
    ],
  },
  proof: {
    title: 'How proving works',
    steps: [
      'Pick one credential, then one claim — each maps to a compact circuit.',
      'If your private witness cannot satisfy the claim, generation fails privately.',
      'Review the disclosed vs. concealed lists before sharing anything.',
    ],
  },
};

export const OnboardingHint: FC<{ page: keyof typeof COPY }> = ({ page }) => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const copy = COPY[page];
  if (dismissed || !copy) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card relative mb-8 overflow-hidden border-teal/30 bg-teal/[0.04] p-5"
      role="note"
      aria-label="Getting started hints"
    >
      <button
        className="btn-ghost absolute right-3 top-3 !p-1.5"
        aria-label="Dismiss hints"
        onClick={() => {
          try {
            localStorage.setItem(STORAGE_KEY, '1');
          } catch {
            /* private mode */
          }
          setDismissed(true);
        }}
      >
        <X className="h-3.5 w-3.5 text-mist" />
      </button>
      <p className="flex items-center gap-2 text-body-sm font-semibold text-ink">
        <Sparkles className="h-4 w-4 text-teal" />
        {copy.title}
      </p>
      <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {copy.steps.map((step, i) => (
          <li key={step} className="flex gap-2.5 text-caption text-graphite">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-deep/[0.07] font-mono text-[10px] font-bold text-deep">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Link to="/how-it-works" className="link-quiet mt-4 text-caption">
        Watch the full 6-step walkthrough <ArrowRight className="h-3 w-3" />
      </Link>
    </motion.div>
  );
};
