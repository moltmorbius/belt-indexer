/**
 * Discord Notification Module
 *
 * Posts real-time notifications to Discord when Belt AA events are indexed.
 * Uses Ponder offchain tables to track what's already been notified,
 * preventing duplicate posts across reindexes.
 */

const EXPLORER = "https://scan.pulsechain.com";

const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ??
  "https://discord.com/api/webhooks/1466236502555230362/KqiDbSkWVuyVjY0sP2wkZJd60Olr5YjQccBiicn86Yzb_HJzv0NG5LWFC6W-_A5pBCkw";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortenAddr(addr: string): string {
  if (!addr || addr === "0x0000000000000000000000000000000000000000")
    return "none";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatPLS(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth < 0.001) return `${(eth * 1e6).toFixed(2)} μPLS`;
  if (eth < 1) return `${eth.toFixed(6)} PLS`;
  return `${eth.toFixed(4)} PLS`;
}

function formatTimestamp(ts: bigint): string {
  return new Date(Number(ts) * 1000).toISOString();
}

function timeSince(deployTs: bigint, nowTs: bigint): string {
  const diff = Number(nowTs - deployTs);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ---------------------------------------------------------------------------
// Embed builders
// ---------------------------------------------------------------------------

export interface WalletState {
  address: string;
  factory: string;
  entryPointVersion: string;
  deployedAt: bigint;
  totalUserOps: number;
  totalGasSpent: bigint;
}

export interface UserOpInfo {
  userOpHash: string;
  sender: string;
  paymaster: string;
  success: boolean;
  actualGasCost: bigint;
  actualGasUsed: bigint;
  entryPointVersion: string;
  txHash: string;
  blockNumber: bigint;
  timestamp: bigint;
}

export interface DeployInfo {
  userOpHash: string;
  account: string;
  factory: string;
  paymaster: string;
  entryPointVersion: string;
  txHash: string;
  blockNumber: bigint;
  timestamp: bigint;
}

function buildUserOpEmbed(op: UserOpInfo, wallet: WalletState | null) {
  const statusEmoji = op.success ? "✅" : "❌";
  const fields = [
    {
      name: "Sender",
      value: `[\`${shortenAddr(op.sender)}\`](${EXPLORER}/address/${op.sender})`,
      inline: true,
    },
    {
      name: "Paymaster",
      value:
        op.paymaster === "0x0000000000000000000000000000000000000000"
          ? "Self-sponsored"
          : `[\`${shortenAddr(op.paymaster)}\`](${EXPLORER}/address/${op.paymaster})`,
      inline: true,
    },
    {
      name: "Gas Cost",
      value: formatPLS(op.actualGasCost),
      inline: true,
    },
    {
      name: "Tx",
      value: `[\`${shortenAddr(op.txHash)}\`](${EXPLORER}/tx/${op.txHash})`,
      inline: true,
    },
    {
      name: "Block",
      value: `${op.blockNumber}`,
      inline: true,
    },
    {
      name: "EntryPoint",
      value: op.entryPointVersion,
      inline: true,
    },
  ];

  // Add wallet state summary if we have it
  if (wallet) {
    const age = timeSince(wallet.deployedAt, op.timestamp);
    fields.push({
      name: "📊 Wallet Summary",
      value: [
        `**Total Ops:** ${wallet.totalUserOps}`,
        `**Total Gas:** ${formatPLS(wallet.totalGasSpent)}`,
        `**Account Age:** ${age}`,
        `**Factory:** ${wallet.entryPointVersion}`,
      ].join(" • "),
      inline: false,
    });
  }

  return {
    title: `${statusEmoji} UserOperation — ${op.entryPointVersion}`,
    color: op.success ? 0x00cc66 : 0xff3333,
    fields,
    timestamp: formatTimestamp(op.timestamp),
    footer: { text: `UserOp ${shortenAddr(op.userOpHash)}` },
  };
}

function buildDeployEmbed(dep: DeployInfo) {
  return {
    title: `🚀 New Account Deployed — ${dep.entryPointVersion}`,
    color: 0x5865f2,
    description: `A new Belt smart account has been created on PulseChain.`,
    fields: [
      {
        name: "Account",
        value: `[\`${dep.account}\`](${EXPLORER}/address/${dep.account})`,
        inline: false,
      },
      {
        name: "Factory",
        value: `[\`${shortenAddr(dep.factory)}\`](${EXPLORER}/address/${dep.factory})`,
        inline: true,
      },
      {
        name: "Paymaster",
        value:
          dep.paymaster === "0x0000000000000000000000000000000000000000"
            ? "Self-sponsored"
            : `[\`${shortenAddr(dep.paymaster)}\`](${EXPLORER}/address/${dep.paymaster})`,
        inline: true,
      },
      {
        name: "EntryPoint",
        value: dep.entryPointVersion,
        inline: true,
      },
      {
        name: "Tx",
        value: `[\`${shortenAddr(dep.txHash)}\`](${EXPLORER}/tx/${dep.txHash})`,
        inline: true,
      },
      {
        name: "Block",
        value: `${dep.blockNumber}`,
        inline: true,
      },
    ],
    timestamp: formatTimestamp(dep.timestamp),
    footer: { text: `Deploy ${shortenAddr(dep.userOpHash)}` },
  };
}

// ---------------------------------------------------------------------------
// Send to Discord
// ---------------------------------------------------------------------------

async function sendWebhook(embeds: any[]): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL || embeds.length === 0) return false;

  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Belt Indexer",
        embeds,
      }),
    });

    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status} ${res.statusText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Discord webhook error:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API — called from indexer handlers
// ---------------------------------------------------------------------------

export async function notifyUserOp(
  op: UserOpInfo,
  wallet: WalletState | null,
): Promise<boolean> {
  const embed = buildUserOpEmbed(op, wallet);
  return sendWebhook([embed]);
}

export async function notifyAccountDeployed(
  dep: DeployInfo,
): Promise<boolean> {
  const embed = buildDeployEmbed(dep);
  return sendWebhook([embed]);
}
