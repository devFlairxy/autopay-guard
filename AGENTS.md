# AgentPay Guard — Project Notes

## Deployed Contracts

| Contract | Network | Address | Explorer |
|---|---|---|---|
| AgentBudgetVault | Arc Testnet (v1, platform-owned) | `0x3de92200857fe6e51e1e10a7f712a6527125ed56` | [View](https://explorer.testnet.arc.io/address/0x3de92200857fe6e51e1e10a7f712a6527125ed56) |
| AgentBudgetVault | Arc Testnet (v2, user-owned) | `0x974d2bae551e668a4dbbd2330e4c04a6f2e76003` | [View](https://explorer.testnet.arc.io/address/0x974d2bae551e668a4dbbd2330e4c04a6f2e76003) |
| AgentBudgetVault | Arc Mainnet (**active**) | `0x497406448129ABDB84c701d4B1cfE50d73e08E51` | [View](https://explorer.arc.io/address/0x497406448129ABDB84c701d4B1cfE50d73e08E51) |

## Constructor Args (Mainnet deploy — active frontend target)
- `_usdc`: `0x3600000000000000000000000000000000000000` (Arc USDC)
- `initialOwner_`: `0xF2f7914AF5fDEB1cF8e0Ea3f1F664E1E3e6Fa95d`
- `_authorizedAgent`: `0x0000000000000000000000000000000000000000` (set via Configure screen)
- `_maxPaymentAmount`: `100000000` (100 USDC)
- `_totalSpendingLimit`: `1000000000` (1000 USDC)

## Constructor Args (Testnet v2 deploy — reference)
- `_usdc`: `0x3600000000000000000000000000000000000000` (Arc USDC)
- `initialOwner_`: `0xF2f7914AF5fDEB1cF8e0Ea3f1F664E1E3e6Fa95d`
- `_authorizedAgent`: `0xBf73F58C8711E38389f164f77073cdF1d454BA23`
- `_maxPaymentAmount`: `5000000` (5 USDC)
- `_totalSpendingLimit`: `20000000` (20 USDC)

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
