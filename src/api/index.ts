import { db } from "ponder:api";
import * as schema from "ponder:schema";
import { Hono } from "hono";
import { client } from "ponder";
import {
  smartAccount,
  userOperation,
  accountDeployed,
  accountActivity,
} from "ponder:schema";
import { desc, eq, sql } from "ponder";

const app = new Hono();

// SQL over HTTP — @ponder/client connects here for type-safe queries
app.use("/sql/*", client({ db, schema }));

// Stats endpoint — summary of indexed data
// Note: /health is reserved by Ponder (built-in healthcheck)
app.get("/stats", async (c) => {
  const [accounts] = await db
    .select({ count: sql<number>`count(*)` })
    .from(smartAccount);

  const [ops] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userOperation);

  const [deploys] = await db
    .select({ count: sql<number>`count(*)` })
    .from(accountDeployed);

  return c.json({
    totalAccounts: accounts?.count ?? 0,
    totalUserOps: ops?.count ?? 0,
    totalDeployments: deploys?.count ?? 0,
  });
});

// Recent activity for a specific account
app.get("/account/:address", async (c) => {
  const address = c.req.param("address") as `0x${string}`;

  const account = await db
    .select()
    .from(smartAccount)
    .where(eq(smartAccount.address, address))
    .limit(1);

  if (account.length === 0) {
    return c.json({ error: "Account not found" }, 404);
  }

  const recentOps = await db
    .select()
    .from(accountActivity)
    .where(eq(accountActivity.account, address))
    .orderBy(desc(accountActivity.timestamp))
    .limit(20);

  return c.json({
    account: account[0],
    recentActivity: recentOps,
  });
});

export default app;