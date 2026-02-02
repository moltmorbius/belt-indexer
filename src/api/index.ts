import { db } from "ponder:api";
import schema from "ponder:schema";
import { graphql, client } from "ponder";
import { Hono } from "hono";

const app = new Hono();

// GraphQL API — auto-generated from schema
app.use("/graphql", graphql({ db, schema }));

// SQL over HTTP — @ponder/client connects here for type-safe queries
app.use("/sql/*", client({ db, schema }));

export default app;
