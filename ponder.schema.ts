import { index, onchainEnum, onchainTable } from "ponder";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const entryPointVersion = onchainEnum("entry_point_version", [
  "v0_7",
  "v0_8",
  "v0_9",
]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/**
 * Every UserOperationEvent emitted by the indexed EntryPoint contracts.
 * Filtered at the handler level to Belt ecosystem addresses only.
 */
export const userOperation = onchainTable(
  "user_operation",
  (t) => ({
    /** userOpHash — primary key */
    id: t.text().primaryKey(),
    /** Chain ID where this operation occurred */
    chainId: t.integer().notNull(),
    /** Account (sender) address */
    sender: t.hex().notNull(),
    /** Paymaster address (or zero address) */
    paymaster: t.hex().notNull(),
    /** UserOp nonce */
    nonce: t.bigint().notNull(),
    /** Whether the sender call succeeded */
    success: t.boolean().notNull(),
    /** Actual gas cost (wei) */
    actualGasCost: t.bigint().notNull(),
    /** Actual gas used */
    actualGasUsed: t.bigint().notNull(),
    /** Which EntryPoint version emitted this event */
    entryPointVersion: entryPointVersion("entry_point_version").notNull(),
    /** EntryPoint contract address */
    entryPoint: t.hex().notNull(),
    /** Transaction hash */
    txHash: t.hex().notNull(),
    /** Block hash */
    blockHash: t.hex().notNull(),
    /** Block number */
    blockNumber: t.bigint().notNull(),
    /** Block timestamp (unix seconds) */
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({
    chainIdx: index().on(table.chainId),
    senderIdx: index().on(table.sender),
    paymasterIdx: index().on(table.paymaster),
    blockIdx: index().on(table.blockNumber),
    timestampIdx: index().on(table.timestamp),
  }),
);

/**
 * Every AccountDeployed event — a new smart account was created via a factory.
 */
export const accountDeployed = onchainTable(
  "account_deployed",
  (t) => ({
    /** Composite key: userOpHash (unique per deployment) */
    id: t.text().primaryKey(),
    /** Chain ID where this account was deployed */
    chainId: t.integer().notNull(),
    /** The deployed smart account address */
    account: t.hex().notNull(),
    /** Factory address that deployed the account */
    factory: t.hex().notNull(),
    /** Paymaster that sponsored the deployment (or zero) */
    paymaster: t.hex().notNull(),
    /** EntryPoint version */
    entryPointVersion: entryPointVersion("entry_point_version").notNull(),
    /** EntryPoint contract address */
    entryPoint: t.hex().notNull(),
    /** Transaction hash */
    txHash: t.hex().notNull(),
    /** Block hash */
    blockHash: t.hex().notNull(),
    /** Block number */
    blockNumber: t.bigint().notNull(),
    /** Block timestamp (unix seconds) */
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({
    chainIdx: index().on(table.chainId),
    accountIdx: index().on(table.account),
    factoryIdx: index().on(table.factory),
    blockIdx: index().on(table.blockNumber),
  }),
);

/**
 * Tracks known smart accounts deployed via Belt factories.
 * Updated when AccountDeployed is processed. Used for filtering.
 */
export const smartAccount = onchainTable(
  "smart_account",
  (t) => ({
    /** Account address — primary key */
    address: t.hex().primaryKey(),
    /** Chain ID where this account lives */
    chainId: t.integer().notNull(),
    /** Factory that created it */
    factory: t.hex().notNull(),
    /** EOA owner address (extracted from initCode) */
    ownerAddress: t.hex(),
    /** EntryPoint version (from factory version) */
    entryPointVersion: entryPointVersion("entry_point_version").notNull(),
    /** Block when deployed */
    deployedAtBlock: t.bigint().notNull(),
    /** Timestamp when deployed */
    deployedAt: t.bigint().notNull(),
    /** Total UserOps executed by this account */
    totalUserOps: t.integer().notNull().default(0),
    /** Total gas spent (wei) */
    totalGasSpent: t.bigint().notNull().default(0n),
  }),
  (table) => ({
    chainIdx: index().on(table.chainId),
    factoryIdx: index().on(table.factory),
  }),
);

/**
 * Activity log for deployed Belt smart accounts.
 * Every UserOp from a known Belt account gets an entry here.
 */
export const accountActivity = onchainTable(
  "account_activity",
  (t) => ({
    /** Unique ID: txHash-logIndex */
    id: t.text().primaryKey(),
    /** Chain ID where this activity occurred */
    chainId: t.integer().notNull(),
    /** The smart account address */
    account: t.hex().notNull(),
    /** userOpHash */
    userOpHash: t.text().notNull(),
    /** Whether the call succeeded */
    success: t.boolean().notNull(),
    /** Gas cost (wei) */
    gasCost: t.bigint().notNull(),
    /** EntryPoint version */
    entryPointVersion: entryPointVersion("entry_point_version").notNull(),
    /** Transaction hash */
    txHash: t.hex().notNull(),
    /** Block hash */
    blockHash: t.hex().notNull(),
    /** Block number */
    blockNumber: t.bigint().notNull(),
    /** Block timestamp */
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({
    chainIdx: index().on(table.chainId),
    accountIdx: index().on(table.account),
    blockIdx: index().on(table.blockNumber),
    timestampIdx: index().on(table.timestamp),
  }),
);
