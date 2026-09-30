#!/usr/bin/env python3
"""Generates the VeriCred documentation diagrams as SVG (docs/*.svg).

Run:  python3 scripts/generate-doc-diagrams.py
Then: npx sharp-cli -i docs/<name>.svg -o docs/<name>.png   (or the loop in docs/README notes)

All diagrams reflect the ACTUAL implementation:
 - contract/src/cac.compact circuits + witnesses
 - vericred-ui store entities (Credential, ProofRecord, VerificationLog, Transaction)
 - services/cac-service.ts ledger interface (DemoLedger / LiveCacLedger)
 - scripts/deploy-preview.ts pipeline against Midnight Preview endpoints
"""
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'docs')
os.makedirs(OUT, exist_ok=True)

# ---- theme ------------------------------------------------------------------
BG      = '#FAFAF8'
PAPER   = '#FFFFFF'
INK     = '#111111'
MIST    = '#6B6B67'
FAINT   = '#98978F'
LINE    = '#D8D8D0'
DEEP    = '#173B57'
ACAD    = '#2F6B8A'
TEAL    = '#4F8582'
SAGE    = '#A8C1B5'
SAND    = '#C9B99A'
ERROR   = '#A8452F'
WARN    = '#A8792C'
SUCCESS = '#3E7C5B'
SANS    = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
MONO    = "'JetBrains Mono', Menlo, monospace"


def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


class Canvas:
    def __init__(self, w, h, title):
        self.w, self.h = w, h
        self.parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w*2}" height="{h*2}" font-family="{SANS}">',
            f'<rect width="{w}" height="{h}" fill="{BG}"/>',
            '<defs>',
            f'<marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{MIST}"/></marker>',
            f'<marker id="arwT" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{TEAL}"/></marker>',
            f'<marker id="arwA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{ACAD}"/></marker>',
            '</defs>',
        ]
        self.text(w / 2, 46, title, 21, INK, anchor='middle', weight=600)

    def text(self, x, y, t, size=13, color=INK, anchor='start', weight=400, font=SANS, spacing=None, opacity=1.0):
        extra = f' letter-spacing="{spacing}"' if spacing else ''
        op = f' opacity="{opacity}"' if opacity != 1.0 else ''
        self.parts.append(
            f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}" font-family="{font}"{extra}{op}>{esc(t)}</text>'
        )

    def box(self, x, y, w, h, title, lines=(), accent=DEEP, dashed=False, fill=PAPER, title_color=None, badge=None):
        dash = ' stroke-dasharray="6 5"' if dashed else ''
        self.parts.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{LINE}" stroke-width="1.2"{dash}/>'
        )
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="5" rx="2.5" fill="{accent}" opacity="0.9"/>')
        self.text(x + w / 2, y + 34, title, 14.5, title_color or INK, anchor='middle', weight=600)
        ly = y + 56
        for ln in lines:
            self.text(x + w / 2, ly, ln, 11, MIST, anchor='middle', font=MONO)
            ly += 17
        if badge:
            bw = 10 * len(badge) + 20
            self.parts.append(
                f'<rect x="{x + w - bw - 12}" y="{y + 12}" width="{bw}" height="20" rx="10" fill="{accent}" opacity="0.12"/>'
            )
            self.text(x + w - bw / 2 - 12, y + 26, badge, 9.5, accent, anchor='middle', weight=700, font=MONO)
        return (x, y, w, h)

    def conn(self, x1, y1, x2, y2, label=None, color=MIST, marker='arw', dashed=False, lx=None, ly=None):
        dash = ' stroke-dasharray="5 5"' if dashed else ''
        self.parts.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.6"{dash} marker-end="url(#{marker})"/>'
        )
        if label:
            self.text(lx if lx is not None else (x1 + x2) / 2 + 10, ly if ly is not None else (y1 + y2) / 2, label, 10.5, color, font=MONO)

    def elbow(self, x1, y1, xm, ym, x2, y2, color=MIST, marker='arw', dashed=False):
        dash = ' stroke-dasharray="5 5"' if dashed else ''
        self.parts.append(
            f'<path d="M {x1} {y1} L {xm} {ym} L {x2} {y2}" fill="none" stroke="{color}" stroke-width="1.6"{dash} marker-end="url(#{marker})"/>'
        )

    def label(self, x, y, t, color=FAINT, size=10.5, anchor='start'):
        self.text(x, y, t.upper(), size, color, anchor=anchor, weight=700, font=MONO, spacing='0.14em')

    def save(self, name):
        self.parts.append('</svg>')
        with open(os.path.join(OUT, name), 'w') as f:
            f.write('\n'.join(self.parts))
        print('wrote', name)


# ---- 1. architecture ---------------------------------------------------------
c = Canvas(1180, 1290, 'VeriCred — Privacy Architecture (dual-state)')
c.label(60, 92, 'issuer')
c.box(390, 110, 400, 96, 'University · Issuer', ['registrar session · institution owner key (Bytes<32>)'], DEEP, badge='ON-CHAIN KEY')
c.conn(590, 206, 590, 258, 'issue / revoke / suspend')
c.label(60, 250, 'application')
c.box(340, 262, 500, 96, 'VeriCred Application', ['vericred-ui · Vite + React 19 SPA · services/cac-service.ts'], ACAD, badge='CLIENT')
# split
c.elbow(470, 358, 300, 420, 300, 452)
c.elbow(710, 358, 880, 420, 880, 452)
c.label(120, 444, 'public state')
c.box(120, 456, 380, 128, 'Public Ledger State', ['credentialStatus: Map<Bytes<32>, Status>', 'institutionOwner · totalCredentialsIssued', 'no names · no grades · no transcripts'], ACAD, badge='ON-CHAIN')
c.label(690, 444, 'private state')
c.box(690, 456, 380, 128, 'Private Witness Data', ['studentGpaScaled (Uint<16>) · degreeIdHash', 'localSecretKey · transcript · identity', 'encrypted · holder device only'], TEAL, dashed=True, badge='OFF-CHAIN')
# merge into circuits
c.elbow(300, 584, 300, 640, 470, 668)
c.elbow(880, 584, 880, 640, 710, 668)
c.box(340, 672, 500, 118, 'Compact ZK Circuits', ['issueCredential · verifyCredential', 'proveGpaThreshold · proveDegreeMatch', 'suspend / reinstate / revoke · batchIssue'], DEEP, badge='ZK')
c.conn(590, 790, 590, 842, 'proofs + commitments')
c.box(340, 846, 500, 96, 'Midnight Preview Network', ['rpc.preview.midnight.network · indexer v4 (HTTP+WS)', 'proof server (docker :6300)'], ACAD, badge='L1')
c.conn(590, 942, 590, 994, 'ZK proof artifact (verificationId · QR · link)')
c.box(390, 998, 400, 84, 'ZK Verification', ['boolean claim check vs public parameters'], SUCCESS, badge='VERIFY')
c.elbow(470, 1082, 330, 1130, 330, 1160)
c.elbow(710, 1082, 850, 1130, 850, 1160)
c.box(170, 1164, 320, 88, 'Student · Holder', ['wallet · proofs · selective disclosure'], SAGE)
c.box(690, 1164, 320, 88, 'Verifier · Relying Party', ['employer · admissions · boards'], SAND)
c.save('architecture.svg')

# ---- 2. user flow ------------------------------------------------------------
c = Canvas(980, 1360, 'VeriCred — User Flow (issue → prove → verify)')
steps = [
    ('University', 'registrar signs credential · witness sealed to student device', DEEP),
    ('Issue Credential', 'circuit issueCredential → commitment VALID on ledger', ACAD),
    ('Student Receives Credential', 'appears in /wallet with live ledger status', SAGE),
    ('Student Selects Claim', 'GPA ≥ x · degree validity · graduation · course · custom', TEAL),
    ('Generate ZK Proof', 'local Compact circuit · staged witness → proving → validation', DEEP),
    ('Share Proof', 'verificationId VP-XXXX-XXXX · QR · public link /verify/:id', ACAD),
    ('Verifier Opens Portal', '/verify — ID · QR paste · proof upload · wallet session', SAND),
    ('Verify Claim', 'proof checked vs public parameters in milliseconds', SUCCESS),
    ('Credential Valid ✓', 'claim + institution shown · private academic data NOT disclosed', SUCCESS),
]
y = 110
for i, (t, sub, col) in enumerate(steps):
    c.box(240, y, 500, 88, t, [sub], col)
    if i < len(steps) - 1:
        c.conn(490, y + 88, 490, y + 128)
    y += 132
c.save('user-flow.svg')

# ---- 3. ER diagram ------------------------------------------------------------
c = Canvas(1420, 980, 'VeriCred — Entity Model (as implemented)')
c.label(60, 100, 'entities (store/useWalletStore.ts)')


def entity(x, y, w, name, rows, accent):
    h = 44 + 18 * len(rows)
    c.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{PAPER}" stroke="{LINE}" stroke-width="1.2"/>')
    c.parts.append(f'<path d="M {x} {y+34} L {x+w} {y+34}" stroke="{LINE}" stroke-width="1"/>')
    c.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="34" rx="10" fill="{accent}" opacity="0.10"/>')
    c.text(x + 14, y + 22, name, 13, accent, weight=700)
    ry = y + 54
    for r in rows:
        key, typ = r
        c.text(x + 14, ry, key, 10.5, INK, font=MONO)
        c.text(x + w - 14, ry, typ, 10, FAINT, anchor='end', font=MONO)
        ry += 18
    return (x, y, w, h)


e_inst = entity(70, 140, 330, 'Institution (issuer)', [
    ('ownerPublicKey', 'Bytes<32>'), ('name', 'string'),
    ('— ledger: institutionOwner', 'on-chain'),
], DEEP)
e_cred = entity(545, 140, 380, 'Credential', [
    ('id / displayId', 'VC-XXXX-XXXX'), ('credentialHash', '0x…32B (public)'),
    ('type', 'DEGREE|GPA|…'), ('title · program', 'string'),
    ('status', 'ACTIVE|PENDING|'), ('', 'SUSPENDED|EXPIRED|REVOKED'),
    ('issuedAt · expiresAt', 'ISO'), ('revocationReason', 'string?'),
    ('gpa (PRIVATE witness)', 'never rendered'), ('proofsGenerated · verifications', 'counters'),
    ('timeline[]', 'CredentialEvent'),
], ACAD)
e_stu = entity(1070, 140, 300, 'Student (holder)', [
    ('studentName', 'string'), ('studentDid', 'did:midnight:vc:…'),
    ('walletAddress', 'mn_addr_preview…'),
], SAGE)
e_proof = entity(545, 560, 380, 'ProofRecord', [
    ('verificationId', 'VP-XXXX-XXXX'), ('credentialId', '→ Credential'),
    ('claimType · claimLabel', 'enum · string'), ('threshold · customClaim', 'number? · string?'),
    ('circuit', 'proveGpaThreshold|…'), ('proofHash · txHash', '0x…'),
    ('createdAt · expiresAt', 'ISO'), ('disclosed[] · concealed[]', 'string[]'),
    ('status', 'GENERATED|VERIFIED|EXPIRED'),
], TEAL)
e_ver = entity(1070, 560, 300, 'VerificationLog', [
    ('verifier', 'string'), ('verifierType', 'EMPLOYER|…'),
    ('target', 'VP-/VC- id'), ('claim', 'string'),
    ('outcome', 'PASSED|FAILED'), ('at', 'ISO'),
], SAND)
e_tx = entity(70, 560, 330, 'Transaction (ledger event)', [
    ('type', 'ISSUE|PROOF|VERIFY|…'), ('hash', '0x… (truncated)'),
    ('status', 'CONFIRMED|PENDING|…'), ('details · timestamp', 'string · ISO'),
], WARN)
# relations
c.conn(400, 210, 545, 210, '1 issues *')
c.conn(1070, 210, 925, 210, '* holds 1')
c.conn(735, 424, 735, 560, '1 generates *')
c.conn(925, 640, 1070, 640, '1 checked by *')
c.conn(545, 700, 400, 700, 'mirrored by', dashed=True)
c.text(70, 920, 'On-chain (Midnight Preview): credentialStatus Map<Bytes<32>, CredentialStatus> · institutionOwner · totalCredentialsIssued counter.', 11.5, MIST, font=MONO)
c.text(70, 942, 'Off-chain (browser): entity tables above persisted via zustand+localStorage in demo mode; live mode reads the same shapes from the indexer.', 11.5, MIST, font=MONO)
c.save('er-diagram.svg')

# ---- 4. zk proof flow ----------------------------------------------------------
c = Canvas(1180, 1020, 'VeriCred — ZK Proof Flow (what stays private, what is proven)')
c.box(390, 110, 400, 110, 'Private Credential Data', ['GPA 3.71 · transcript · identity · DOB · address', 'holder device · encrypted at rest'], TEAL, dashed=True, badge='PRIVATE')
c.conn(590, 220, 590, 268, 'witness extraction')
c.box(390, 272, 400, 110, 'Witness (CacPrivateState)', ['studentGpaScaled: 371 (Uint<16>)', 'degreeIdHash: Bytes<32> · localSecretKey'], TEAL, dashed=True, badge='PRIVATE')
c.conn(590, 382, 590, 430, 'circuit evaluation (local, proof server)')
c.box(340, 434, 500, 122, 'Compact Circuit', ['proveGpaThreshold(credHash, minGpaScaled)', 'assert status == VALID && gpa >= threshold', 'public output: boolean only'], DEEP, badge='ZK')
c.conn(590, 556, 590, 604, 'succinct proof + verificationId')
c.box(390, 608, 400, 96, 'ZK Proof', ['proofHash · claimLabel “GPA ≥ 3.50”', 'QR · shareable link · expiry'], ACAD, badge='ARTIFACT')
c.conn(590, 704, 590, 752)
c.box(440, 756, 300, 84, 'Verifier', ['employer · admissions · board'], SAND)
c.conn(590, 840, 590, 888)
c.box(390, 892, 400, 84, 'Verified Claim ✓', ['boolean attestation + public labels only'], SUCCESS, badge='RESULT')
# side panels
c.box(60, 434, 240, 210, 'Exposed publicly', ['credentialHash', 'status transitions', 'institutionOwner', 'proof validity', 'claim boolean'], ACAD)
c.box(880, 434, 240, 210, 'Never exposed', ['exact GPA (3.71)', 'transcript rows', 'identity · DOB', 'address · student ID', 'course grades'], TEAL, dashed=True)
c.save('zk-proof-flow.svg')

# ---- 5. credential lifecycle ----------------------------------------------------
c = Canvas(1420, 620, 'VeriCred — Credential Lifecycle (states supported by cac.compact)')
sx, sy = 90, 240
states = [
    ('PENDING', 'queued for sign-off', WARN, 90),
    ('ACTIVE', 'VALID on ledger', SUCCESS, 330),
    ('SUSPENDED', 'temporary · reversible', WARN, 570),
    ('REVOKED', 'permanent', ERROR, 850),
    ('EXPIRED', 'validity window ended', FAINT, 1090),
]
for name, sub, col, x in states:
    c.box(x, sy, 210, 92, name, [sub], col, badge='STATE')
c.conn(300, sy + 46, 330, sy + 46)
c.conn(540, sy + 30, 570, sy + 30, 'suspendCredential')
c.conn(570, sy + 66, 540, sy + 66, 'reinstateCredential')
c.conn(780, sy + 46, 850, sy + 46, 'revokeCredential')
c.conn(540, sy + 92, 1090, sy + 150, 'expiry (validity window)', dashed=True, lx=760, ly=sy + 140)
c.label(90, 120, 'timeline events (CredentialEvent)')
events = ['CREATED', 'ISSUED', 'RECEIVED', 'PROOF', 'VERIFIED', 'STATUS', 'REVOKED / EXPIRED']
ex = 90
for i, ev in enumerate(events):
    w = 14 * len(ev) + 44
    c.parts.append(f'<rect x="{ex}" y="140" width="{w}" height="34" rx="17" fill="{PAPER}" stroke="{LINE}"/>')
    c.text(ex + w / 2, 162, ev, 11, DEEP, anchor='middle', weight=600, font=MONO)
    if i < len(events) - 1:
        c.parts.append(f'<line x1="{ex+w}" y1="157" x2="{ex+w+18}" y2="157" stroke="{LINE}" stroke-width="1.6" marker-end="url(#arw)"/>')
    ex += w + 22
c.text(90, 470, 'Proofs stop verifying the moment status leaves ACTIVE (suspended/revoked/expired) — evaluation logic in services/verification.ts.', 12, MIST)
c.text(90, 494, 'All transitions are institution-authorized circuits; every transition is recorded as a ledger Transaction in the UI activity feed.', 12, MIST)
c.save('credential-lifecycle.svg')

# ---- 6. deployment architecture --------------------------------------------------
c = Canvas(1360, 980, 'VeriCred — Deployment Architecture (actual repository)')
c.box(480, 100, 400, 96, 'Browser', ['student · registrar · verifier sessions', 'Lace / 1AM wallet via dApp connector v4'], SAGE, badge='CLIENT')
c.conn(680, 196, 680, 244)
c.box(430, 248, 500, 110, 'vericred-ui — Vite + React 19 SPA', ['Tailwind · Framer Motion · R3F/Drei (lazy) · zustand', 'static hosting / vercel.json rewrites · build → dist/'], ACAD, badge='FRONTEND')
c.conn(680, 358, 680, 406, 'services/cac-service.ts · CredentialLedger')
c.box(160, 410, 460, 122, 'DemoLedger (default)', ['mirrors cac.compact circuit ABI 1:1', 'offline-safe demo state · localStorage', 'no private keys · no network writes'], MIST, dashed=True, badge='DEMO')
c.box(740, 410, 460, 122, 'LiveCacLedger (VITE_CAC_LIVE=true)', ['midnight-js providers stack (same as scripts/)', 'wallet · proof · indexer · private state', 'single wiring point — no UI rewrite'], TEAL, badge='LIVE')
c.conn(970, 532, 970, 584)
c.box(700, 588, 540, 140, 'Midnight SDK services', ['proof server · docker midnightntwrk/proof-server:8.1.0 (:6300)', 'indexer v4 HTTP+WS · RPC (polkadot-js extrinsics)', 'wallet-sdk (shielded · unshielded · dust)'], DEEP, badge='INFRA')
c.conn(970, 728, 970, 776)
c.box(700, 780, 540, 110, 'Compact CAC Contract → Midnight Preview', ['zkir + prover/verifier keys · compiler 0.31.1 · lang 0.23.0', 'deployed via scripts/deploy-preview.ts (tsx)'], ACAD, badge='L1')
# side: tooling
c.box(160, 588, 460, 190, 'Repository tooling', ['contract/ — cac.compact + managed artifacts + vitest', 'api/ — providers & typed API (BBoard · cac-types)', 'vericred-cli/ — wallet facade · dust utilities', 'scripts/ — deploy-preview.ts · deploy-preprod.ts', 'docs/ — deployment-preview.json (real values)'], WARN, badge='TOOLING')
c.conn(390, 588, 560, 470, 'deploys', dashed=True, lx=420, ly=540)
c.save('deployment-architecture.svg')

print('done')
