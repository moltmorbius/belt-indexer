import { db } from "ponder:api";
import schema from "ponder:schema";
import { graphql, client } from "ponder";
import { Hono } from "hono";

const app = new Hono();

// Health endpoint for Railway health checks
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now() });
});

// GraphQL API — auto-generated from schema
app.use("/graphql", graphql({ db, schema }));

// SQL over HTTP — @ponder/client connects here for type-safe queries
app.use("/sql/*", client({ db, schema }));

export default app;
