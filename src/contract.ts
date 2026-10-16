/**
 * AgentBudgetVault contract configuration.
 * Address is loaded from environment so testnet/mainnet can be swapped without code changes.
 */
import artifact from '../contracts/out/AgentBudgetVault.sol/AgentBudgetVault.json'

// Arc Testnet deployment (default for development)
// Override VITE_VAULT_ADDRESS to point at a different deployment
export const VAULT_ADDRESS = (
  import.meta.env.VITE_VAULT_ADDRESS ?? '0x3de92200857fe6e51e1e10a7f712a6527125ed56'
) as `0x${string}`

export const VAULT_ABI = artifact.abi

// ABI typed fragments used directly in wagmi hook calls
export const AGENT_BUDGET_VAULT = {
  address: VAULT_ADDRESS,
  abi: VAULT_ABI,
} as const
