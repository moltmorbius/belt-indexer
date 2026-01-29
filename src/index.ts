import { ponder } from "ponder:registry";
import {
  userOperation,
  accountDeployed,
  smartAccount,
  accountActivity,
} from "ponder:schema";
import type { EntryPointVersion } from "./constants";
import {
  BELT_FACTORIES,
  BELT_EXECUTORS,
  BELT_IMPLEMENTATIONS,
  ENTRY_POINT_VERSIONS,
  isBeltFactory,
  ZERO_ADDRESS,
} from "./constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a sender address belongs to the Belt ecosystem.
 *
 * A UserOp is "Belt-related" if any of these are true:
 * 1. sender is a known Belt executor/utility wallet
 * 2. sender was deployed by a Belt factory (tracked in smartAccount table)
 * 3. paymaster is a known Belt address
 *
 * For (2) we check the database — if the account was previously seen via
 * AccountDeployed from a Belt factory, it's tracked.
 */
async function isBeltRelated(
  sender: `0x${string}`,
  paymaster: `0x${string}`,
  db: any,
): Promise<boolean> {
  const senderLower = sender.toLowerCase();
  const paymasterLower = paymaster.toLowerCase();

  // Check if sender is a known executor/utility wallet
  if (BELT_EXECUTORS.has(senderLower)) return true;

  // Check if sender is a known implementation
  if (BELT_IMPLEMENTATIONS.has(senderLower)) return true;

  // Check if paymaster is a Belt address
  if (BELT_EXECUTORS.has(paymasterLower)) return true;

  // Check if sender is a known Belt smart account (deployed via our factories)
  try {
    const account = await db.find(smartAccount, { address: sender });
    if (account) return true;
  } catch {
    // Table might not have the account yet — that's fine
  }

  return false;
}

// ---------------------------------------------------------------------------
// UserOperationEvent handlers — one per EntryPoint version
// ---------------------------------------------------------------------------

function registerUserOpHandler(
  contractName: string,
  version: EntryPointVersion,
) {
  ponder.on(`${contractName}:UserOperationEvent`, async ({ event, context }) => {
    const { userOpHash, sender, paymaster, nonce, success, actualGasCost, actualGasUsed } =
      event.args;

    const paymasterAddr = paymaster ?? ZERO_ADDRESS;

    // Filter: only index Belt-related UserOps
    const related = await isBeltRelated(sender, paymasterAddr, context.db);
    if (!related) return;

    const id = userOpHash;

    // Insert UserOperation record
    await context.db
      .insert(userOperation)
      .values({
        id,
        sender,
        paymaster: paymasterAddr,
        nonce,
        success,
        actualGasCost,
        actualGasUsed,
        entryPointVersion: version,
        entryPoint: event.log.address,
        txHash: event.transaction.hash,
        blockNumber: BigInt(event.block.number),
        timestamp: BigInt(event.block.timestamp),
      })
      .onConflictDoNothing();

    // Insert AccountActivity record
    const activityId = `${event.transaction.hash}-${event.log.logIndex}`;
    await context.db
      .insert(accountActivity)
      .values({
        id: activityId,
        account: sender,
        userOpHash: id,
        success,
        gasCost: actualGasCost,
        entryPointVersion: version,
        txHash: event.transaction.hash,
        blockNumber: BigInt(event.block.number),
        timestamp: BigInt(event.block.timestamp),
      })
      .onConflictDoNothing();

    // Update smart account stats if it's a known account
    try {
      const existing = await context.db.find(smartAccount, { address: sender });
      if (existing) {
        await context.db
          .update(smartAccount, { address: sender })
          .set({
            totalUserOps: existing.totalUserOps + 1,
            totalGasSpent: existing.totalGasSpent + actualGasCost,
          });
      }
    } catch {
      // Account not tracked yet — will be tracked once AccountDeployed is seen
    }
  });
}

// ---------------------------------------------------------------------------
// AccountDeployed handlers — one per EntryPoint version
// ---------------------------------------------------------------------------

function registerAccountDeployedHandler(
  contractName: string,
  version: EntryPointVersion,
) {
  ponder.on(`${contractName}:AccountDeployed`, async ({ event, context }) => {
    const { userOpHash, sender, factory, paymaster } = event.args;

    const factoryAddr = factory ?? ZERO_ADDRESS;
    const paymasterAddr = paymaster ?? ZERO_ADDRESS;

    // Filter: only index accounts deployed by Belt factories
    if (!isBeltFactory(factoryAddr)) return;

    const id = userOpHash;

    // Insert AccountDeployed record
    await context.db
      .insert(accountDeployed)
      .values({
        id,
        account: sender,
        factory: factoryAddr,
        paymaster: paymasterAddr,
        entryPointVersion: version,
        entryPoint: event.log.address,
        txHash: event.transaction.hash,
        blockNumber: BigInt(event.block.number),
        timestamp: BigInt(event.block.timestamp),
      })
      .onConflictDoNothing();

    // Track the smart account for future UserOp filtering
    await context.db
      .insert(smartAccount)
      .values({
        address: sender,
        factory: factoryAddr,
        entryPointVersion: version,
        deployedAtBlock: BigInt(event.block.number),
        deployedAt: BigInt(event.block.timestamp),
        totalUserOps: 0,
        totalGasSpent: 0n,
      })
      .onConflictDoNothing();
  });
}

// ---------------------------------------------------------------------------
// Register all handlers
// ---------------------------------------------------------------------------

for (const [contractName, version] of Object.entries(ENTRY_POINT_VERSIONS)) {
  registerUserOpHandler(contractName, version);
  registerAccountDeployedHandler(contractName, version);
}
