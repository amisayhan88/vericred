# Support

## Getting help

- **Documentation** — start with [README.md](README.md) and the [docs/](docs/) index:
  [architecture](docs/architecture.md) · [deployment](docs/deployment.md) · [ZK proofs](docs/zk-proofs.md) ·
  [user flows](docs/user-flows.md) · [security](docs/security.md) · [troubleshooting](docs/troubleshooting.md)
- **Bugs & feature requests** — open an issue on [GitHub](https://github.com/amisayhan88/vericred/issues)
  with reproduction steps, expected vs. actual behavior, and (for deployment issues) the relevant
  script log lines.
- **Security vulnerabilities** — please follow [SECURITY.md](SECURITY.md) (private disclosure, not a
  public issue).
- **Contributing** — see [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## Running the project

```bash
npm install
docker compose up -d proof-server   # ZK prover on :6300
npm run dev                         # UI → http://localhost:5173
```

Deployment, wallet funding (faucet captcha), DUST provisioning, stuck transactions and
“contract not found” diagnostics are covered step-by-step in
[docs/troubleshooting.md](docs/troubleshooting.md).

## Response expectations

This repository is maintained on a best-effort basis. Issues with complete reproduction details are
typically triaged within a few business days.
