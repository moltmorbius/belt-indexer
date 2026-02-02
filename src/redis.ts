/**
 * Redis Notification Tracker
 *
 * Uses Redis to track which events have been notified to Discord.
 * Completely isolated from Ponder's database — survives reindexes.
 *
 * Strategy: Store a high-water mark (latest notified block number).
 * On resync, skip all events at or below the watermark.
 * Also stores individual event IDs for exact dedup within the watermark block.
 */

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Keys
const WATERMARK_KEY = "belt:notifications:watermark"; // latest notified block
const EVENT_PREFIX = "belt:notifications:event:"; // per-event dedup
const EVENT_TTL = 60 * 60 * 24 * 30; // 30 days TTL for event keys

let redis: Redis | null = null;
let connectionFailed = false;

function getRedis(): Redis | null {
  if (connectionFailed) return null;

  if (!redis) {
    try {
      redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            connectionFailed = true;
            console.warn(
              "Redis connection failed after 3 retries — notifications will fire without dedup",
            );
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });
      redis.connect().catch(() => {
        connectionFailed = true;
        redis = null;
      });
    } catch {
      connectionFailed = true;
      return null;
    }
  }
  return redis;
}

/**
 * Check if an event should be notified.
 * Returns true if the event is NEW (should notify).
 * Returns false if already notified (skip).
 *
 * Also records the event as notified and updates the watermark.
 */
export async function shouldNotify(
  eventId: string,
  blockNumber: bigint,
): Promise<boolean> {
  const r = getRedis();
  if (!r) {
    // No Redis — skip notifications entirely to avoid spam on resync
    // This is safe: once Redis connects, new events will be notified
    return false;
  }

  try {
    // Check watermark — if this block is below watermark, skip
    const watermark = await r.get(WATERMARK_KEY);
    if (watermark) {
      const wm = BigInt(watermark);
      if (blockNumber < wm) return false;

      // Same block as watermark — check individual event
      if (blockNumber === wm) {
        const exists = await r.exists(`${EVENT_PREFIX}${eventId}`);
        if (exists) return false;
      }
    }

    // Record this event
    await r.set(`${EVENT_PREFIX}${eventId}`, "1", "EX", EVENT_TTL);

    // Update watermark if this block is newer
    if (!watermark || blockNumber > BigInt(watermark)) {
      await r.set(WATERMARK_KEY, blockNumber.toString());
    }

    return true;
  } catch (err) {
    console.error("Redis error in shouldNotify:", err);
    return false;
  }
}

/**
 * Get the current watermark (for debugging/health checks).
 */
export async function getWatermark(): Promise<bigint | null> {
  const r = getRedis();
  if (!r) return null;

  try {
    const wm = await r.get(WATERMARK_KEY);
    return wm ? BigInt(wm) : null;
  } catch {
    return null;
  }
}

/**
 * Gracefully close Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => {});
    redis = null;
  }
}
