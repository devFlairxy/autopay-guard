# AgentPay Guard — Project Notes

## Deployed Contracts

| Contract | Network | Address | Explorer |
|---|---|---|---|
| AgentBudgetVault | Arc Testnet | `0x3de92200857fe6e51e1e10a7f712a6527125ed56` | [View](https://explorer.testnet.arc.io/address/0x3de92200857fe6e51e1e10a7f712a6527125ed56) |
| AgentBudgetVault | Arc Mainnet | _pending — requires owner confirmation_ | — |

## Constructor Args (Testnet deploy)
- `_usdc`: `0x3600000000000000000000000000000000000000` (Arc USDC)
- `_owner`: `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42` (platform deployer)
- `_authorizedAgent`: `0x0000000000000000000000000000000000000000` (set via setAgent)
- `_maxPaymentAmount`: `100000000` (100 USDC in 6-decimal units)
- `_totalSpendingLimit`: `1000000000` (1000 USDC in 6-decimal units)

## Arc Mainnet USDC
`0x3600000000000000000000000000000000000000` — same address on mainnet and testnet.

## Key files
- `contracts/AgentBudgetVault.sol` — vault contract
- `contracts/test/AgentBudgetVault.t.sol` — 57 Foundry tests (all passing)
- `contracts/contract-metadata/AgentBudgetVault.json` — deployment metadata
- `src/App.tsx` — frontend entry point
- `src/components/` — screen components

## Security review summary
- Balanced review passed: Ownable → Ownable2Step (two-step ownership), renounceOwnership disabled
- Slither: only intentional zero-agent findings (by design, for revocation support)
- 57 tests: all pass
- No Critical or High findings
