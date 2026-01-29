#!/usr/bin/env node

/**
 * Discord Notification Script for Belt Indexer
 *
 * Queries the Ponder GraphQL API for new events since the last check,
 * then posts formatted messages to a Discord webhook.
 *
 * Usage:
 *   node scripts/notify-discord.mjs
 *
 * Environment:
 *   PONDER_GRAPHQL_URL  — Ponder GraphQL endpoint (default: http://localhost:42069/graphql)
 *   DISCORD_WEBHOOK_URL — Discord webhook URL
 *
 * Can be run as a cron job, e.g.:
 *   */5 * * * * cd /path/to/belt-indexer && node scripts/notify-discord.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, ".last-check");

const GRAPHQL_URL =
  process.env.PONDER_GRAPHQL_URL ?? "http://localhost:42069/graphql";
const WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ??
  "https://discord.com/api/webhooks/1466236502555230362/KqiDbSkWVuyVjY0sP2wkZJd60Olr5YjQccBiicn86Yzb_HJzv0NG5LWFC6W-_A5pBCkw";

const EXPLORER = "https://scan.pulsechain.com";

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

function loadLastCheck() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8").trim();
    return BigInt(raw);
  } catch {
    // First run — look back 1 hour
    return BigInt(Math.floor(Date.now() / 1000) - 3600);
  }
}

function saveLastCheck(timestamp) {
  fs.writeFileSync(STATE_FILE, timestamp.toString(), "utf-8");
}

// ---------------------------------------------------------------------------
// GraphQL queries
// ---------------------------------------------------------------------------

async function queryGraphQL(query) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchNewUserOps(sinceTimestamp) {
  const query = `{
    userOperations(
      where: { timestamp_gt: "${sinceTimestamp}" }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        sender
        paymaster
        success
        actualGasCost
        actualGasUsed
        entryPointVersion
        txHash
        blockNumber
        timestamp
      }
    }
  }`;
  const data = await queryGraphQL(query);
  return data?.data?.userOperations?.items ?? [];
}

async function fetchNewDeployments(sinceTimestamp) {
  const query = `{
    accountDeployeds(
      where: { timestamp_gt: "${sinceTimestamp}" }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        account
        factory
        paymaster
        entryPointVersion
        txHash
        blockNumber
        timestamp
      }
    }
  }`;
  const data = await queryGraphQL(query);
  return data?.data?.accountDeployeds?.items ?? [];
}

// ---------------------------------------------------------------------------
// Discord formatting
// ---------------------------------------------------------------------------

function shortenAddr(addr) {
  if (!addr || addr === "0x0000000000000000000000000000000000000000")
    return "none";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatWei(wei) {
  const eth = Number(BigInt(wei)) / 1e18;
  if (eth < 0.001) return `${(eth * 1e6).toFixed(2)} μPLS`;
  if (eth < 1) return `${eth.toFixed(6)} PLS`;
  return `${eth.toFixed(4)} PLS`;
}

function buildUserOpEmbed(op) {
  const statusEmoji = op.success ? "✅" : "❌";
  return {
    title: `${statusEmoji} UserOperation — ${op.entryPointVersion}`,
    color: op.success ? 0x00cc66 : 0xff3333,
    fields: [
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
        value: formatWei(op.actualGasCost),
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
    ],
    timestamp: new Date(Number(op.timestamp) * 1000).toISOString(),
    footer: { text: `UserOp ${shortenAddr(op.id)}` },
  };
}

function buildDeployEmbed(dep) {
  return {
    title: `🚀 Account Deployed — ${dep.entryPointVersion}`,
    color: 0x5865f2,
    fields: [
      {
        name: "Account",
        value: `[\`${shortenAddr(dep.account)}\`](${EXPLORER}/address/${dep.account})`,
        inline: true,
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
    timestamp: new Date(Number(dep.timestamp) * 1000).toISOString(),
    footer: { text: `UserOp ${shortenAddr(dep.id)}` },
  };
}

// ---------------------------------------------------------------------------
// Send to Discord
// ---------------------------------------------------------------------------

async function sendWebhook(embeds) {
  if (embeds.length === 0) return;

  // Discord allows max 10 embeds per message
  for (let i = 0; i < embeds.length; i += 10) {
    const batch = embeds.slice(i, i + 10);
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Belt Indexer",
        avatar_url:
          "https://raw.githubusercontent.com/moltmorbius/belt-indexer/main/assets/belt-icon.png",
        embeds: batch,
      }),
    });

    if (!res.ok) {
      console.error(
        `Discord webhook failed: ${res.status} ${res.statusText}`,
      );
      const body = await res.text();
      console.error(body);
    } else {
      console.log(`Sent ${batch.length} embed(s) to Discord.`);
    }

    // Rate limit: wait between batches
    if (i + 10 < embeds.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const lastCheck = loadLastCheck();
  const now = BigInt(Math.floor(Date.now() / 1000));

  console.log(
    `Checking for new events since ${lastCheck} (${new Date(Number(lastCheck) * 1000).toISOString()})`,
  );

  try {
    const [userOps, deployments] = await Promise.all([
      fetchNewUserOps(lastCheck),
      fetchNewDeployments(lastCheck),
    ]);

    console.log(
      `Found ${userOps.length} new UserOps, ${deployments.length} new deployments.`,
    );

    const embeds = [
      ...deployments.map(buildDeployEmbed),
      ...userOps.map(buildUserOpEmbed),
    ];

    if (embeds.length > 0) {
      await sendWebhook(embeds);
    } else {
      console.log("No new events to report.");
    }

    // Update state to the latest event timestamp, or now if nothing found
    let maxTs = lastCheck;
    for (const op of userOps) {
      const ts = BigInt(op.timestamp);
      if (ts > maxTs) maxTs = ts;
    }
    for (const dep of deployments) {
      const ts = BigInt(dep.timestamp);
      if (ts > maxTs) maxTs = ts;
    }

    saveLastCheck(maxTs > lastCheck ? maxTs : now);
    console.log("Done.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
