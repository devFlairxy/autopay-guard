/**
 * AgentBudgetVault contract configuration.
 * Set VITE_TARGET_CHAIN=testnet in .env to switch to Arc testnet (default: mainnet).
 * Set VITE_VAULT_ADDRESS to override the default address for either network.
 */
import artifact from '../contracts/out/AgentBudgetVault.sol/AgentBudgetVault.json'

const targetChain = (import.meta.env.VITE_TARGET_CHAIN as string | undefined) ?? 'mainnet'
export const IS_MAINNET = targetChain === 'mainnet'

// Default addresses per network
const MAINNET_ADDRESS  = '0x497406448129ABDB84c701d4B1cfE50d73e08E51' as `0x${string}`
const TESTNET_ADDRESS  = '0x974d2bae551e668a4dbbd2330e4c04a6f2e76003' as `0x${string}`

export const VAULT_ADDRESS = (
  (import.meta.env.VITE_VAULT_ADDRESS as string | undefined)
  ?? (IS_MAINNET ? MAINNET_ADDRESS : TESTNET_ADDRESS)
) as `0x${string}`

// Deploy block — used to bound getLogs scans to avoid exceeding RPC range limits.
const MAINNET_DEPLOY_BLOCK = '26241297'   // confirmed from eth_getLogs scan
const TESTNET_DEPLOY_BLOCK = '67417024'

export const VAULT_DEPLOY_BLOCK = BigInt(
  (import.meta.env.VITE_VAULT_DEPLOY_BLOCK as string | undefined)
  ?? (IS_MAINNET ? MAINNET_DEPLOY_BLOCK : TESTNET_DEPLOY_BLOCK)
)

// Explorer base URL used for transaction links across all screens
export const EXPLORER_BASE = IS_MAINNET
  ? 'https://explorer.arc.io'
  : 'https://explorer.testnet.arc.io'

export const VAULT_ABI = artifact.abi

// ABI typed fragments used directly in wagmi hook calls
export const AGENT_BUDGET_VAULT = {
  address: VAULT_ADDRESS,
  abi: VAULT_ABI,
} as const
