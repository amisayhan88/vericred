import React, { useState } from 'react';
import { Credential, useWalletStore } from '../store/useWalletStore';
import { ShieldCheck, X, CheckCircle2, Sparkles, Copy, Check } from 'lucide-react';

interface ZkProofModalProps {
  credential: Credential | null;
  onClose: () => void;
}

export const ZkProofModal: React.FC<ZkProofModalProps> = ({ credential, onClose }) => {
  const { generateZkProof } = useWalletStore();
  const [proofType, setProofType] = useState<'GPA_THRESHOLD' | 'DEGREE_VERIFICATION'>('GPA_THRESHOLD');
  const [gpaThreshold, setGpaThreshold] = useState<number>(3.5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  if (!credential) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const proof = await generateZkProof(credential.id, proofType, gpaThreshold);
      setGeneratedProof(proof);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedProof) {
      navigator.clipboard.writeText(JSON.stringify(generatedProof, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-canvas rounded-xl p-6 max-w-lg w-full border border-hairline shadow-card relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted hover:text-ink transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-card flex items-center justify-center text-ink">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-title-md text-ink">Zero-Knowledge Prover</h2>
            <p className="text-caption text-muted">Generate selective disclosure witness proof</p>
          </div>
        </div>

        {!generatedProof ? (
          <div className="mt-6 space-y-4">
            {/* Privacy Notice */}
            <div className="card-feature p-4 text-body-sm text-body leading-relaxed">
              <span className="font-semibold text-ink block mb-1">Privacy Guarantee</span>
              This circuit generates a cryptographic proof that proves your statement to verifiers without revealing your name, student ID, or exact GPA.
            </div>

            {/* Claim Type Selector */}
            <div>
              <label className="text-body-sm font-semibold text-ink block mb-2">Select Claim Type</label>
              <div className="nav-pill-group w-full">
                <button
                  type="button"
                  onClick={() => setProofType('GPA_THRESHOLD')}
                  className={`nav-pill-item flex-1 text-center ${proofType === 'GPA_THRESHOLD' ? 'active' : ''}`}
                >
                  GPA Threshold
                </button>
                <button
                  type="button"
                  onClick={() => setProofType('DEGREE_VERIFICATION')}
                  className={`nav-pill-item flex-1 text-center ${proofType === 'DEGREE_VERIFICATION' ? 'active' : ''}`}
                >
                  Degree Match
                </button>
              </div>
            </div>

            {/* GPA Slider */}
            {proofType === 'GPA_THRESHOLD' && (
              <div>
                <label className="text-body-sm font-semibold text-ink block mb-1.5">
                  Minimum GPA Threshold: <span className="text-success font-semibold">{gpaThreshold.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="2.0"
                  max="4.0"
                  step="0.05"
                  value={gpaThreshold}
                  onChange={(e) => setGpaThreshold(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-primary w-full mt-4"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Computing ZK Proof Circuit...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Generate Midnight ZK Proof</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Success Result */}
            <div className="p-4 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-body flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
              <div>
                <h4 className="text-title-sm text-ink">ZK Proof Verified & Signed</h4>
                <p className="text-caption text-muted mt-0.5">{generatedProof.verifiedClaim}</p>
              </div>
            </div>

            {/* Proof Packet */}
            <div className="p-3 rounded-md bg-surface-dark text-on-dark font-mono text-caption space-y-1 overflow-x-auto">
              <div className="text-brand-accent font-semibold">// Midnight ZK Proof Packet</div>
              <div>Proof ID: {generatedProof.id}</div>
              <div>Status: {generatedProof.status}</div>
              <div>Timestamp: {generatedProof.timestamp}</div>
              <div>Nullifier: 0x8a92...e31f</div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCopy}
                className="btn-secondary flex-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Proof'}</span>
              </button>
              <button
                onClick={onClose}
                className="btn-primary px-6"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
