import React from 'react';
import { Credential } from '../store/useWalletStore';
import { GraduationCap, ShieldCheck, CheckCircle2, AlertTriangle, Key, Lock } from 'lucide-react';

interface CredentialCardProps {
  credential: Credential;
  onGenerateProof?: (cred: Credential) => void;
}

export const CredentialCard: React.FC<CredentialCardProps> = ({ credential, onGenerateProof }) => {
  return (
    <div className="card-feature group hover:shadow-card transition-shadow duration-200">
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-canvas border border-hairline flex items-center justify-center text-ink">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-title-sm text-ink">{credential.degree}</h3>
            <p className="text-caption text-muted">{credential.major}</p>
          </div>
        </div>

        <span className={`badge-pill text-caption ${
          credential.status === 'VALID'
            ? 'bg-[#ecfdf5] text-success'
            : credential.status === 'SUSPENDED'
            ? 'bg-[#fef9c3] text-warning'
            : 'bg-[#fef2f2] text-error'
        }`}>
          {credential.status === 'VALID' && <CheckCircle2 className="w-3 h-3" />}
          {credential.status === 'SUSPENDED' && <AlertTriangle className="w-3 h-3" />}
          {credential.status === 'REVOKED' && <AlertTriangle className="w-3 h-3" />}
          {credential.status}
        </span>
      </div>

      {/* Details Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-hairline-soft text-body-sm">
        <div>
          <span className="text-caption text-muted block mb-0.5">Institution</span>
          <span className="font-semibold text-ink">{credential.institution}</span>
        </div>
        <div>
          <span className="text-caption text-muted block mb-0.5">Graduation Year</span>
          <span className="font-semibold text-ink">{credential.graduationYear}</span>
        </div>
        <div>
          <span className="text-caption text-muted block mb-0.5">Private GPA</span>
          <span className="font-semibold text-ink flex items-center gap-1">
            <Lock className="w-3 h-3 text-muted" /> {credential.gpa.toFixed(2)} (Sealed)
          </span>
        </div>
        <div>
          <span className="text-caption text-muted block mb-0.5">Issued Date</span>
          <span className="font-semibold text-ink">{credential.issueDate}</span>
        </div>
      </div>

      {/* Credential Hash */}
      <div className="mt-4 p-3 rounded-md bg-canvas border border-hairline flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted truncate max-w-[210px]">
          <Key className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono text-caption truncate">{credential.credentialHash}</span>
        </div>
        <span className="text-caption text-muted-soft shrink-0">ZK Sealed</span>
      </div>

      {/* CTA */}
      {onGenerateProof && (
        <button
          onClick={() => onGenerateProof(credential)}
          className="btn-primary w-full mt-4"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Generate ZK Proof</span>
        </button>
      )}
    </div>
  );
};
