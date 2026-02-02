// ---------------------------------------------------------------------------
// Belt Ecosystem Addresses — PulseChain
// ---------------------------------------------------------------------------

/** EntryPoint version identifier */
export type EntryPointVersion = "v0_7" | "v0_8" | "v0_9";

/** Map of Ponder contract name → EntryPoint version */
export const ENTRY_POINT_VERSIONS: Record<string, EntryPointVersion> = {
  EntryPointV07: "v0_7",
  EntryPointV08: "v0_8",
  EntryPointV09: "v0_9",
};

/** Map of Ponder chain name → chain ID */
export const CHAIN_IDS: Record<string, number> = {
  pulsechain: 369,
};

/** EntryPoint contract addresses (for reference) */
export const ENTRY_POINTS = {
  "v0_7": "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  "v0_8": "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108",
  "v0_9": "0x433709009B8330FDa32311DF1C2AFA402eD8D009",
} as const;

/** Belt SimpleAccountFactory addresses (lowercase for comparison) */
export const BELT_FACTORIES = new Set([
  "0xc03f10876b6f9b2c6927ea8b2ac9552c6bb2ce68", // v0.7
  "0x13e9ed32155810fdbd067d4522c492d6f68e5944", // v0.8
  "0xad07bbb7bea77e323c838481f668d22864e9f66e", // v0.9
]);

/** Belt executor & utility wallets (lowercase) */
export const BELT_EXECUTORS = new Set([
  "0x1071ce6fcc1a042208ccb60d5d417c2ba9c8e750", // executor1
  "0x668e2e474f7c602e86d256a85a2890a0eadf205f", // executor2
  "0x1bbc4b7cb2eb49480c200eae411750572e6f30d9", // utility
]);

/** Belt account implementation addresses (lowercase) */
export const BELT_IMPLEMENTATIONS = new Set([
  "0x28426d752372d68d34340bd94390950dce3c9ec3", // v0.8
  "0xcc5c9b932f18d8dd08ee2fffef52b09583e247c0", // v0.9
]);

/** Zero address for missing paymaster/factory */
export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the given address is a known Belt factory */
export function isBeltFactory(address: `0x${string}` | string): boolean {
  return BELT_FACTORIES.has(address.toLowerCase());
}

/** Returns true if the given address is a known Belt executor/utility */
export function isBeltExecutor(address: `0x${string}` | string): boolean {
  return BELT_EXECUTORS.has(address.toLowerCase());
}

/** Returns the EntryPoint version for a given contract address */
export function getEntryPointVersion(
  address: string,
): EntryPointVersion | undefined {
  const lower = address.toLowerCase();
  for (const [version, addr] of Object.entries(ENTRY_POINTS)) {
    if (addr.toLowerCase() === lower) return version as EntryPointVersion;
  }
  return undefined;
}
