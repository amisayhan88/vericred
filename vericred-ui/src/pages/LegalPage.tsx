import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Reveal } from '../components/ui/primitives';

const Block: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <Reveal>
    <section className="border-b border-line-soft pb-8">
      <h2 className="text-title-lg text-ink">{title}</h2>
      <div className="mt-3 max-w-2xl space-y-3 text-body-sm leading-relaxed text-mist">{children}</div>
    </section>
  </Reveal>
);

export const LegalPage: FC = () => (
  <div style={{ paddingTop: 64 }}>
    <section className="border-b border-line bg-paper" style={{ padding: '56px 0 32px' }}>
      <div className="container-vc">
        <p className="overline">Policy</p>
        <h1 className="mt-2.5 text-display-lg text-ink">Privacy & terms</h1>
        <p className="mt-2 max-w-xl text-body-md text-mist">
          The short version: we architect systems so that nobody — including us — holds your academic record.
        </p>
      </div>
    </section>
    <section style={{ padding: '56px 0 112px' }}>
      <div className="container-vc max-w-3xl space-y-10">
        <Block title="What VeriCred stores">
          <p>
            Public: credential commitments (32-byte hashes), credential status transitions, and the institution owner
            key. These anchor verification and revocation on the Midnight ledger.
          </p>
          <p>
            Private: grades, GPA values, transcripts and identity fields live exclusively in the holder’s encrypted
            local witness state provider. Verification events in this demo portal are retained in your browser only.
          </p>
        </Block>
        <Block title="Proof handling">
          <p>
            A VeriCred proof discloses only the fields listed at generation time. Verifiers see the attestation, the
            public institution label, and nothing else. Proofs carry their own expiry and fail the moment the underlying
            credential is revoked or suspended on-chain.
          </p>
        </Block>
        <Block title="Demo state">
          <p>
            This deployment runs against a clearly isolated demo ledger that mirrors the compiled Compact circuit ABI
            (issueCredential, verifyCredential, proveGpaThreshold, proveDegreeMatch, revokeCredential,
            suspendCredential, reinstateCredential, batchIssueCredentials). Transaction identifiers are simulated and
            marked as such. Setting <code className="font-mono text-deep">VITE_CAC_LIVE</code> switches the same service
            interface to the deployed contract.
          </p>
        </Block>
        <Block title="Terms of evaluation">
          <p>
            The product may be evaluated, forked and self-hosted under the repository license. Institution names in the
            demo dataset are fictional; no real records or identities are represented.
          </p>
        </Block>
        <div className="flex items-center justify-between pt-2">
          <Link to="/" className="link-quiet text-body-sm">
            <ShieldCheck className="h-4 w-4 text-teal" /> Back to product
          </Link>
          <span className="mono-label">last reviewed {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </section>
  </div>
);

export default LegalPage;
