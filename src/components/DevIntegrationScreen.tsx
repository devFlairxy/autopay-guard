import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { AGENT_BUDGET_VAULT, VAULT_ADDRESS } from '../contract'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2 py-1 transition-colors"
      style={{
        background: 'rgba(172,198,233,0.1)',
        color: copied ? 'var(--success)' : 'var(--accent)',
        border: '1px solid rgba(172,198,233,0.2)',
      }}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

interface CodeBlockProps {
  code: string
  lang?: string
}
function CodeBlock({ code, lang }: CodeBlockProps) {
  return (
    <div
      className="relative rounded-xl"
      style={{ background: 'rgba(13,27,47,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>
          {lang ?? 'code'}
        </span>
        <CopyButton text={code.trim()} />
      </div>
      <pre
        className="overflow-x-auto px-4 py-3 text-xs leading-relaxed mono"
        style={{ color: 'var(--ink-2)' }}
      >
        <code>{code.trim()}</code>
      </pre>
    </div>
  )
}

const solidityInterface = `// SPDX-License-Identifier: MIT
interface IAgentBudgetVault {
    // View
    function usdc() external view returns (address);
    function authorizedAgent() external view returns (address);
    function maxPaymentAmount() external view returns (uint256);
    function totalSpendingLimit() external view returns (uint256);
    function totalSpent() external view returns (uint256);
    function remainingBudget() external view returns (uint256);
    function vaultBalance() external view returns (uint256);
    function approvedRecipients(address) external view returns (bool);
    function usedJobRefs(bytes32) external view returns (bool);
    function paused() external view returns (bool);
    function owner() external view returns (address);
    function pendingOwner() external view returns (address);

    // Owner actions
    function deposit(uint256 amount) external;
    function setAgent(address newAgent) external;
    function addRecipient(address recipient) external;
    function removeRecipient(address recipient) external;
    function setMaxPaymentAmount(uint256 newMax) external;
    function setTotalSpendingLimit(uint256 newLimit) external;
    function pause() external;
    function unpause() external;
    function ownerWithdraw(uint256 amount) external;

    // Agent action
    function agentPay(address recipient, uint256 amount, bytes32 jobRef) external;
}`

const tsIntegration = `import { createPublicClient, createWalletClient, http, parseUnits, keccak256, toBytes } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arcTestnet } from 'viem/chains'

const VAULT_ADDRESS = '${VAULT_ADDRESS}'

const VAULT_ABI = [
  {
    name: 'agentPay',
    type: 'function',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'jobRef', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

// ------ Setup ------
const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as \`0x\${string}\`)

const walletClient = createWalletClient({
  account,
  chain: arcTestnet,
  transport: http(),
})

// ------ Execute a payment ------
async function pay(recipientAddress: string, usdcAmount: string, jobReference: string) {
  const jobRef = keccak256(toBytes(jobReference))          // unique bytes32
  const amount = parseUnits(usdcAmount, 6)                 // USDC = 6 decimals

  const txHash = await walletClient.writeContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'agentPay',
    args: [recipientAddress as \`0x\${string}\`, amount, jobRef],
  })

  console.log('Payment submitted:', txHash)
  return txHash
}

// Example usage:
pay('0xRecipientAddress', '10.00', 'invoice-2026-001')
  .then(hash => console.log('Confirmed:', hash))`

const errorsRef = `// Custom errors defined in AgentBudgetVault.sol

error ZeroAddress();               // Constructor: usdc or owner is zero
error ZeroAmount();                // deposit/pay/withdraw: amount is 0
error NotAuthorizedAgent();        // agentPay: caller != authorizedAgent
error RecipientNotApproved();      // agentPay: recipient not in allowlist
error ExceedsMaxPaymentAmount();   // agentPay: amount > maxPaymentAmount
error ExceedsTotalSpendingLimit(); // agentPay: would exceed totalSpendingLimit
error InsufficientVaultBalance();  // agentPay: vault has < amount USDC
error DuplicateJobReference();     // agentPay: jobRef already used
error WithdrawAmountExceedsBalance(); // ownerWithdraw: amount > vaultBalance
error SpendingLimitBelowTotalSpent(); // setTotalSpendingLimit: newLimit < totalSpent
error MaxPaymentExceedsSpendingLimit(); // setMaxPaymentAmount: newMax > totalSpendingLimit
// Inherited: OwnableUnauthorizedAccount, OwnableInvalidOwner (Ownable2Step)
// Inherited: EnforcedPause, ExpectedPause (Pausable)`

const abiJson = JSON.stringify(AGENT_BUDGET_VAULT.abi, null, 2)

type SectionKey = 'interface' | 'typescript' | 'errors' | 'abi'

export function DevIntegrationScreen() {
  const [section, setSection] = useState<SectionKey>('interface')

  const tabs: { id: SectionKey; label: string }[] = [
    { id: 'interface', label: 'Solidity Interface' },
    { id: 'typescript', label: 'TypeScript Example' },
    { id: 'errors', label: 'Custom Errors' },
    { id: 'abi', label: 'ABI (JSON)' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          Developer Integration
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--subtle)' }}>
          Contract interface, TypeScript example, error reference, and ABI.
        </p>
      </div>

      {/* Contract address badge */}
      <div
        className="rounded-xl p-3 flex items-center justify-between gap-3"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="min-w-0">
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>Vault address (Arc Testnet)</p>
          <p className="mono text-sm truncate" style={{ color: 'var(--ink)' }}>{VAULT_ADDRESS}</p>
        </div>
        <CopyButton text={VAULT_ADDRESS} />
      </div>

      {/* Guide overview */}
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Integration guide</h3>
        <ol className="space-y-1.5 text-sm" style={{ color: 'var(--subtle)' }}>
          <li>1. Owner deposits USDC into the vault and calls <span className="mono text-xs">addRecipient</span> for each service address.</li>
          <li>2. Owner calls <span className="mono text-xs">setAgent(agentWalletAddress)</span> to authorize the agent.</li>
          <li>3. Agent signs and broadcasts <span className="mono text-xs">agentPay(recipient, amount, jobRef)</span>.</li>
          <li>4. Contract enforces all limits and rejects duplicates atomically — no frontend can bypass it.</li>
          <li>5. Observe <span className="mono text-xs">AgentPayment</span> events for audit trail.</li>
        </ol>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: section === id ? 'rgba(172,198,233,0.2)' : 'transparent',
              color: section === id ? 'var(--accent)' : 'var(--subtle)',
              border: section === id ? '1px solid rgba(172,198,233,0.3)' : '1px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'interface' && <CodeBlock code={solidityInterface} lang="Solidity" />}
      {section === 'typescript' && <CodeBlock code={tsIntegration} lang="TypeScript" />}
      {section === 'errors' && <CodeBlock code={errorsRef} lang="Solidity — Custom Errors" />}
      {section === 'abi' && <CodeBlock code={abiJson} lang="JSON ABI" />}
    </div>
  )
}
