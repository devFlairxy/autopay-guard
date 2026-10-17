/**
 * Marketing site configuration.
 * Vault/network labels stay aligned with the app contract config.
 */

import {
  EXPLORER_BASE,
  IS_MAINNET,
  VAULT_ADDRESS as CONTRACT_VAULT_ADDRESS,
} from '../contract'

export const VAULT_ADDRESS = CONTRACT_VAULT_ADDRESS

export const EXPLORER_URL = `${EXPLORER_BASE}/address/${VAULT_ADDRESS}`

/** Primary path into the working application (same SPA). */
export const APP_PATH = '/app'

/**
 * Optional absolute URL for the working app (e.g. a separate deploy).
 * If unset, CTAs use same-origin APP_PATH.
 */
export const APP_URL =
  (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '') ||
  null

export function appHref(): string {
  return APP_URL ? `${APP_URL}${APP_PATH}` : APP_PATH
}

export const NETWORK = {
  name: 'Arc',
  deployment: IS_MAINNET ? 'Arc Mainnet' : 'Arc Testnet',
  usdc: '0x3600000000000000000000000000000000000000',
} as const

export const PRODUCT = {
  name: 'AgentPay Guard',
  tagline: 'Let AI agents pay. Keep control.',
  description:
    'Give AI agents the ability to make USDC payments within predefined spending limits and authorization rules. AgentPay Guard brings programmable control to autonomous payments, with rules enforced on-chain.',
} as const
