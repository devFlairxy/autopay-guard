# AgentPay Guard

Programmable on-chain payment control for AI agents.

Fund a USDC vault, authorize one agent, set spending limits and recipient allowlists — then let the agent pay within rules enforced by a smart contract on Arc.

**Let AI agents pay. Keep control.**

## What's in this repo

| Area | Path | Description |
|---|---|---|
| Smart contract | `contracts/AgentBudgetVault.sol` | Non-upgradeable vault with agent authorization, limits, and recipient allowlist |
| Contract tests | `contracts/test/` | Foundry test suite |
| Marketing site | `src/marketing/` | Product homepage (`/`) |
| Application | `src/App.tsx`, `src/components/` | Vault dashboard, configure, agent pay, history, dev guide (`/app`) |
| Deployment notes | `AGENTS.md` | Contract addresses, constructor args, security summary |

## Routes

| Path | Surface |
|---|---|
| `/` | Marketing homepage |
| `/app` | Working application |

## Quick start

```bash
# Install (Bun preferred; npm also works)
bun install
# or: npm install --legacy-peer-deps

# Run locally
bun run dev
# or: npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) for the homepage, or [http://localhost:5173/app](http://localhost:5173/app) for the app.

### Useful scripts

```bash
bun run typecheck      # TypeScript check
bun run build          # typecheck + production build
bun run lint           # oxlint
bun run contracts:build
bun run contracts:test
```

## Environment

Optional Vite env vars:

| Variable | Purpose |
|---|---|
| `VITE_TARGET_CHAIN` | `mainnet` (default) or `testnet` |
| `VITE_VAULT_ADDRESS` | Override vault address for the active chain |
| `VITE_VAULT_DEPLOY_BLOCK` | Bound event log scans |
| `VITE_APP_URL` | Absolute app base URL for marketing CTAs (defaults to same-origin `/app`) |

## Deployed contracts

| Network | Address | Explorer |
|---|---|---|
| Arc Mainnet (default) | `0x497406448129ABDB84c701d4B1cfE50d73e08E51` | [View](https://explorer.arc.io/address/0x497406448129ABDB84c701d4B1cfE50d73e08E51) |
| Arc Testnet (v2) | `0x974d2bae551e668a4dbbd2330e4c04a6f2e76003` | [View](https://explorer.testnet.arc.io/address/0x974d2bae551e668a4dbbd2330e4c04a6f2e76003) |
| Arc Testnet (v1) | `0x3de92200857fe6e51e1e10a7f712a6527125ed56` | [View](https://explorer.testnet.arc.io/address/0x3de92200857fe6e51e1e10a7f712a6527125ed56) |

Arc USDC (mainnet and testnet): `0x3600000000000000000000000000000000000000`

See `AGENTS.md` for constructor args and security review notes.

## How the vault works

1. **Fund** — deposit USDC into the vault  
2. **Authorize** — set one agent wallet, payment limits, and approved recipients  
3. **Execute** — the authorized agent calls `agentPay`; the contract enforces identity, allowlist, per-payment cap, total spending limit, and balance before funds move  

Authorization is not a payment. Depositing is not execution.

## Stack

- Frontend: React, Vite, Tailwind, wagmi, viem, ConnectKit  
- Contracts: Solidity 0.8.28, Foundry, OpenZeppelin 5.1  
- Chain: Arc (USDC settlement)

## License

Contract source is MIT (see `contracts/AgentBudgetVault.sol`).
