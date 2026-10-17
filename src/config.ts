/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet, arc } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'
import { IS_MAINNET } from './contract'

// Use same-origin proxy paths in production so ad-blockers cannot
// intercept direct calls to rpc.mainnet.arc.io / rpc.testnet.arc.io.
// In dev, fall back to the canonical RPC URLs (no proxy available).
const arcRpc      = import.meta.env.PROD ? '/rpc/arc'         : arc.rpcUrls.default.http[0]
const arcTestRpc  = import.meta.env.PROD ? '/rpc/arc-testnet' : arcTestnet.rpcUrls.default.http[0]

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestRpc)
registerChain(arc.id, arcRpc)

export const config = createConfig({
  chains: [arc, arcTestnet, mainnet],
  connectors: [injected()],
  transports: {
    [arc.id]:      http(arcRpc),
    [arcTestnet.id]: http(arcTestRpc),
    [mainnet.id]:  http(), // ENS resolution uses mainnet
  },
})

// The active Arc chain for this deployment
export const activeArcChain = IS_MAINNET ? arc : arcTestnet
